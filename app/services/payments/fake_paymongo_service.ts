import { createHash, randomUUID } from 'node:crypto'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import { urlFor } from '@adonisjs/core/services/url_builder'
import paymentConfig from '#config/payment'
import checkoutConfig from '#config/checkout'
import PaymentException from '#exceptions/payment_exception'
import {
  simulatedCheckoutValidator,
  simulatedRefundValidator,
} from '#validators/payments/simulation'
import type {
  CheckoutInput,
  CheckoutSession,
  PaymentAdapter,
  PaymentRefund,
  RefundInput,
  WebhookInput,
} from '#services/payments/payment_service'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

interface Resource {
  id: string
  input_hash: string
  payload: string
}
interface CheckoutResource {
  input: CheckoutInput
  session: CheckoutSession
}

/** A separate, persistent gateway for local development; never contacts PayMongo. */
export default class FakePayMongoService implements PaymentAdapter {
  readonly provider = 'fake_paymongo'
  readonly liveMode = false
  readonly mutationReplayWindowMs = 23 * 60 * 60 * 1000
  readonly idempotencyScope = 'local-fake-paymongo-v1'

  assertEnabled() {
    if ((!app.inDev && !app.inTest) || paymentConfig.defaultProvider !== this.provider)
      throw new PaymentException('Payment simulator is unavailable', {
        code: 'E_PAYMENT_SIMULATOR_DISABLED',
        status: 404,
      })
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutSession> {
    this.assertEnabled()
    const data = await simulatedCheckoutValidator.validate(input)
    this.total(data)
    const id = randomUUID()
    const session: CheckoutSession = {
      provider: this.provider,
      id,
      url: urlFor(
        'payments.simulations.show',
        { id },
        {
          prefixUrl: new URL(checkoutConfig.publicUrl ?? '').origin,
        }
      ),
      reference: data.reference,
      status: 'pending',
      liveMode: false,
      metadata: data.metadata ?? {},
      payments: [],
    }
    return db.transaction(async (trx) => {
      await trx
        .table('dev_payment_resources')
        .insert({
          id,
          kind: 'checkout',
          idempotency_key: data.idempotencyKey,
          input_hash: this.hash(data),
          payload: JSON.stringify({ input: data, session }),
        })
        .onConflict(['kind', 'idempotency_key'])
        .ignore()
      const row = (await trx
        .from('dev_payment_resources')
        .where({ kind: 'checkout', idempotency_key: data.idempotencyKey })
        .firstOrFail()) as Resource
      this.sameInput(row, data)
      return (JSON.parse(row.payload) as CheckoutResource).session
    })
  }

  async inspectCheckout(id: string) {
    this.assertEnabled()
    const row = await db.from('dev_payment_resources').where({ kind: 'checkout', id }).first()
    if (!row) this.missing()
    return JSON.parse(row.payload) as CheckoutResource
  }

  async getCheckout(id: string) {
    const checkout = await this.inspectCheckout(id)
    return checkout.session
  }

  async expireCheckout(id: string, _idempotencyKey: string) {
    return this.changeCheckout(id, 'expired')
  }

  async changeCheckout(id: string, outcome: 'paid' | 'failed' | 'expired') {
    this.assertEnabled()
    return db.transaction(async (trx) => {
      const { input, session } = await this.lockCheckout(trx, id)
      // Captures and expiry are terminal. Repeated clicks retain the original payment ID.
      if (session.status !== 'pending') return session
      if (outcome === 'expired') session.status = 'expired'
      else {
        session.payments.push({
          id: randomUUID(),
          amount: this.total(input),
          currency: input.currency,
          status: outcome === 'paid' ? 'paid' : 'failed',
        })
        if (outcome === 'paid') session.status = 'paid'
      }
      await trx
        .from('dev_payment_resources')
        .where({ kind: 'checkout', id })
        .update({
          payload: JSON.stringify({ input, session }),
          payment_id: session.payments.find((payment) => payment.status === 'paid')?.id ?? null,
        })
      return session
    })
  }

  async refund(
    input: Omit<RefundInput, 'payment'> & { paymentId: string }
  ): Promise<PaymentRefund> {
    this.assertEnabled()
    const data = await simulatedRefundValidator.validate(input)
    return db.transaction(async (trx) => {
      // Acquire the payment row's write lock before checking the refund balance.
      await trx
        .from('dev_payment_resources')
        .where({ kind: 'checkout', payment_id: data.paymentId })
        .increment('version', 1)
      const row = await trx
        .from('dev_payment_resources')
        .where({ kind: 'checkout', payment_id: data.paymentId })
        .first()
      if (!row) this.missing()
      const existing = (await trx
        .from('dev_payment_resources')
        .where({ kind: 'refund', idempotency_key: data.idempotencyKey })
        .first()) as Resource | undefined
      if (existing) {
        this.sameInput(existing, data)
        return JSON.parse(existing.payload) as PaymentRefund
      }
      const { session } = JSON.parse(row.payload) as CheckoutResource
      const payment = session.payments.find(
        (capture) => capture.id === data.paymentId && capture.status === 'paid'
      )!
      const previous = await trx
        .from('dev_payment_resources')
        .where({ kind: 'refund', payment_id: data.paymentId })
      const refunded = previous.reduce(
        (sum, resource) => sum + (JSON.parse(resource.payload) as PaymentRefund).amount,
        0
      )
      if (data.currency !== payment.currency || data.amount > payment.amount - refunded)
        throw new PaymentException('Refund exceeds the captured balance', {
          code: 'E_PAYMENT_REFUND_BALANCE',
          status: 422,
          outcome: 'rejected',
        })
      const refund: PaymentRefund = {
        provider: this.provider,
        id: randomUUID(),
        paymentId: data.paymentId,
        amount: data.amount,
        currency: data.currency,
        status: 'succeeded',
        liveMode: false,
      }
      await trx.table('dev_payment_resources').insert({
        id: refund.id,
        kind: 'refund',
        idempotency_key: data.idempotencyKey,
        input_hash: this.hash(data),
        payment_id: data.paymentId,
        payload: JSON.stringify(refund),
      })
      return refund
    })
  }

  async getRefund(id: string): Promise<PaymentRefund> {
    this.assertEnabled()
    const row = await db.from('dev_payment_resources').where({ kind: 'refund', id }).first()
    if (!row) this.missing()
    return JSON.parse(row.payload) as PaymentRefund
  }

  async parseWebhook(_input: WebhookInput): Promise<never> {
    // Fake observations originate from the CSRF-protected simulator controls or lookup jobs.
    throw new PaymentException('Use the local payment simulator', {
      code: 'E_PAYMENT_SIMULATOR_WEBHOOK',
      status: 404,
    })
  }

  private async lockCheckout(trx: TransactionClientContract, id: string) {
    await trx.from('dev_payment_resources').where({ kind: 'checkout', id }).increment('version', 1)
    const row = await trx.from('dev_payment_resources').where({ kind: 'checkout', id }).first()
    if (!row) this.missing()
    return JSON.parse(row.payload) as CheckoutResource
  }

  private total(input: CheckoutInput) {
    const amount = input.items.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0)
    if (!Number.isSafeInteger(amount) || amount < 1)
      throw new PaymentException('Invalid checkout total', { code: 'E_PAYMENT_INPUT', status: 422 })
    return amount
  }

  private hash(input: unknown) {
    return createHash('sha256').update(JSON.stringify(input)).digest('hex')
  }

  private sameInput(row: Resource, input: unknown) {
    if (row.input_hash !== this.hash(input))
      throw new PaymentException('Idempotency key already used with different input', {
        code: 'E_PAYMENT_IDEMPOTENCY_CONFLICT',
        status: 409,
        outcome: 'rejected',
      })
  }

  private missing(): never {
    throw new PaymentException('Simulated payment resource not found', {
      code: 'E_PAYMENT_RESOURCE_NOT_FOUND',
      status: 404,
    })
  }
}

import { createHmac } from 'node:crypto'
import type {
  CheckoutInput,
  CheckoutSession,
  PaymentAdapter,
  PaymentEvent,
  PaymentRefund,
  RefundInput,
  WebhookInput,
} from '#services/payments/payment_service'
import PaymentException from '#exceptions/payment_exception'
import type { FakeWebhookEvent, HeldCall } from '#tests/helpers/types'

export default class FakePaymentAdapter implements PaymentAdapter {
  readonly liveMode = false
  readonly mutationReplayWindowMs = 60 * 60 * 1000
  readonly idempotencyScope = 'fake-account'
  sessions = new Map<string, CheckoutSession>()
  refunds = new Map<string, PaymentRefund>()
  keys = new Map<string, string>()
  /** What each checkout session was created with, as the provider stores it. */
  checkoutRequests = new Map<string, CheckoutInput>()
  calls: string[] = []
  loseCheckoutResponse = false
  loseRefundResponse = false
  rejectRefundOnce = false
  unavailable = false
  constructor(readonly provider = 'sandbox') {}
  async createCheckout(input: CheckoutInput) {
    this.calls.push(`create:${input.idempotencyKey}`)
    if (this.unavailable) throw unreachable()
    const id = this.keys.get(input.idempotencyKey) ?? `opaque/session/${this.sessions.size + 1}`
    if (!this.sessions.has(id))
      this.sessions.set(id, {
        provider: this.provider,
        id,
        url: `https://payments.example/checkout/${this.sessions.size + 1}`,
        reference: input.reference,
        status: 'pending',
        liveMode: false,
        metadata: input.metadata ?? {},
        payments: [],
      })
    this.keys.set(input.idempotencyKey, id)
    this.checkoutRequests.set(id, structuredClone(input))
    if (this.loseCheckoutResponse) {
      this.loseCheckoutResponse = false
      throw new PaymentException('Provider timeout', {
        code: 'E_PAYMENT_TRANSPORT',
        status: 502,
        outcome: 'unknown',
        retryable: true,
      })
    }
    return structuredClone(this.sessions.get(id)!)
  }
  async getCheckout(id: string) {
    this.calls.push(`get:${id}`)
    if (this.unavailable) throw unreachable()
    return this.#holdIfAsked('getCheckout', structuredClone(this.sessions.get(id)!))
  }
  async expireCheckout(id: string) {
    this.calls.push(`expire:${id}`)
    const value = this.sessions.get(id)!
    if (value.status !== 'paid') value.status = 'expired'
    return structuredClone(value)
  }
  async refund(input: Omit<RefundInput, 'payment'> & { paymentId: string }) {
    this.calls.push(`refund:${input.idempotencyKey}`)
    if (this.rejectRefundOnce) {
      this.rejectRefundOnce = false
      throw new PaymentException('Rate limited', {
        code: 'E_PAYMENT_PROVIDER',
        status: 502,
        outcome: 'rejected',
        retryable: true,
      })
    }
    const id = this.keys.get(input.idempotencyKey) ?? `opaque/refund/${this.refunds.size + 1}`
    if (!this.refunds.has(id))
      this.refunds.set(id, {
        provider: this.provider,
        id,
        paymentId: input.paymentId,
        amount: input.amount,
        currency: input.currency,
        status: 'pending',
        liveMode: false,
      })
    this.keys.set(input.idempotencyKey, id)
    if (this.loseRefundResponse) {
      this.loseRefundResponse = false
      throw new PaymentException('Provider timeout', {
        code: 'E_PAYMENT_TRANSPORT',
        status: 502,
        outcome: 'unknown',
        retryable: true,
      })
    }
    return structuredClone(this.refunds.get(id)!)
  }
  async getRefund(id: string) {
    this.calls.push(`getRefund:${id}`)
    if (this.unavailable) throw unreachable()
    return this.#holdIfAsked('getRefund', structuredClone(this.refunds.get(id)!))
  }

  #held?: { call: HeldCall; reached: () => void; outcome: Promise<'respond' | 'fail'> }

  /**
   * Holds the next `call` in flight: the provider has read its answer, but the response has
   * not reached the store yet. `reached` resolves once the request is in flight; `respond()`
   * delivers the answer read at that moment and `fail()` loses it as a timeout.
   */
  holdNextCall(call: HeldCall) {
    const inFlight = Promise.withResolvers<void>()
    const outcome = Promise.withResolvers<'respond' | 'fail'>()
    this.#held = { call, reached: inFlight.resolve, outcome: outcome.promise }
    return {
      reached: inFlight.promise,
      respond: () => outcome.resolve('respond'),
      fail: () => outcome.resolve('fail'),
    }
  }

  async #holdIfAsked<T>(call: HeldCall, response: T) {
    const held = this.#held
    if (held?.call !== call) return response
    this.#held = undefined
    held.reached()
    if ((await held.outcome) === 'fail') throw unreachable()
    return response
  }
  /**
   * Verifies a body signed by `webhook()` and builds the event from this provider's own
   * sessions and refunds, so a webhook reports exactly what the provider holds.
   */
  async parseWebhook(input: WebhookInput): Promise<PaymentEvent> {
    const header = input.headers[signatureHeader]
    const rawBody = input.rawBody.toString()
    if (typeof header !== 'string' || header !== sign(rawBody))
      throw new PaymentException('Invalid payment webhook signature', {
        code: 'E_PAYMENT_WEBHOOK_SIGNATURE',
        status: 401,
      })
    const event = JSON.parse(rawBody) as FakeWebhookEvent
    const details = { id: event.id, provider: this.provider, providerType: event.type }
    switch (event.type) {
      case 'checkout.paid':
        return {
          ...details,
          liveMode: false,
          type: 'checkout.paid',
          checkout: structuredClone(this.sessions.get(event.checkoutId)!),
        }
      case 'refund.updated':
        return {
          ...details,
          liveMode: false,
          type: 'refund.updated',
          refund: {
            ...structuredClone(this.refunds.get(event.refundId)!),
            ...(event.status ? { status: event.status } : {}),
          },
        }
      case 'refund.reconcile':
        return {
          ...details,
          liveMode: false,
          type: 'refund.reconcile',
          refund: { provider: this.provider, id: event.refundId },
        }
      case 'payment.refunds_changed':
        return {
          ...details,
          liveMode: false,
          type: 'payment.refunds_changed',
          payment: { provider: this.provider, id: event.paymentId },
        }
    }
  }

  /** The customer pays on the hosted page: each capture is recorded against the session. */
  capture(checkoutId: string, ...payments: { id: string; amount: number }[]) {
    const session = this.sessions.get(checkoutId)!
    session.status = 'paid'
    for (const payment of payments)
      session.payments.push({ ...payment, currency: 'PHP', status: 'paid' })
  }

  /** A refund created outside the application, e.g. from the provider dashboard. */
  addRefund(refund: Omit<PaymentRefund, 'provider' | 'liveMode'>) {
    this.refunds.set(refund.id, { ...refund, provider: this.provider, liveMode: false })
  }

  /** A signed webhook request body and headers, as the provider would send it. */
  webhook(event: FakeWebhookEvent) {
    const rawBody = JSON.stringify(event)
    return { rawBody, headers: { [signatureHeader]: sign(rawBody) } }
  }
}

const unreachable = () =>
  new PaymentException('Provider timeout', {
    code: 'E_PAYMENT_TRANSPORT',
    status: 502,
    outcome: 'unknown',
    retryable: true,
  })

const signatureHeader = 'x-fake-signature'
const sign = (rawBody: string) =>
  createHmac('sha256', 'fake-webhook-secret').update(rawBody).digest('hex')

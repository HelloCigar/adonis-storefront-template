import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import type { Secret } from '@adonisjs/core/helpers'
import {
  apiEnvelopeValidator,
  checkoutExpiryValidator,
  checkoutIdValidator,
  checkoutInputValidator,
  checkoutResponseValidator,
  refundInputValidator,
  refundIdValidator,
  paymentIdValidator,
  refundResponseValidator,
  webhookEnvelopeValidator,
} from '#validators/payments/paymongo'
import PaymentException from '#exceptions/payment_exception'
import {
  type CheckoutInput,
  type CheckoutSession,
  type PaymentEvent,
  type PaymentRefund,
  type RefundInput,
  type WebhookInput,
  type PaymentAdapter,
} from '#services/payments/payment_service'

export interface PayMongoConfig {
  secretKey?: Secret<string>
  webhookSecret?: Secret<string>
  paymentMethods: string[]
  timeoutMs: number
  webhookToleranceSeconds: number
}

export type PayMongoFetch = (url: string, options: RequestInit) => Promise<Response>

interface PaymentValidator<T> {
  validate(data: unknown): Promise<T>
}

async function parseInput<T>(validator: PaymentValidator<T>, input: unknown): Promise<T> {
  try {
    return await validator.validate(input)
  } catch {
    throw new PaymentException('Invalid payment input', { code: 'E_PAYMENT_INPUT', status: 422 })
  }
}

async function parseResponse<T>(
  validator: PaymentValidator<T>,
  payload: unknown,
  webhook = false
): Promise<T> {
  try {
    return await validator.validate(payload)
  } catch {
    invalidResponse(webhook)
  }
}

function invalidResponse(webhook = false): never {
  throw new PaymentException('Invalid payment provider payload', {
    code: webhook ? 'E_PAYMENT_WEBHOOK_PAYLOAD' : 'E_PAYMENT_RESPONSE',
    status: webhook ? 400 : 502,
    outcome: webhook ? 'not_submitted' : 'unknown',
    retryable: !webhook,
  })
}

function invalidSignature(): never {
  throw new PaymentException('Invalid payment webhook signature', {
    code: 'E_PAYMENT_WEBHOOK_SIGNATURE',
    status: 401,
  })
}

/** Stateless adapter; consumers depend on PaymentService rather than this class. */
export default class PayMongoService implements PaymentAdapter {
  readonly provider = 'paymongo'
  readonly mutationReplayWindowMs = 23 * 60 * 60 * 1000

  get idempotencyScope() {
    return createHash('sha256').update(this.secretKey()).digest('hex')
  }
  constructor(
    private readonly config: PayMongoConfig,
    private readonly fetcher: PayMongoFetch = fetch
  ) {}

  async createCheckout(input: CheckoutInput): Promise<CheckoutSession> {
    const data = await parseInput(checkoutInputValidator, input)
    const total = data.items.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0)
    if (!Number.isSafeInteger(total) || total < 100) {
      throw new PaymentException('Invalid checkout total', { code: 'E_PAYMENT_INPUT', status: 422 })
    }
    if (
      !this.config.paymentMethods.length ||
      this.config.paymentMethods.some((method) => !/^[a-z_]+$/.test(method))
    ) {
      this.notConfigured()
    }

    const result = await this.request('/v2/checkout_sessions', 'POST', data.idempotencyKey, {
      reference_number: data.reference,
      line_items: data.items.map((item) => ({
        name: item.name,
        amount: item.unitAmount,
        quantity: item.quantity,
        currency: data.currency,
        ...(item.description !== undefined ? { description: item.description } : {}),
        ...(item.imageUrl ? { images: [item.imageUrl] } : {}),
      })),
      payment_method_types: this.config.paymentMethods,
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
      ...(data.customer ? { billing: data.customer } : {}),
      ...(data.metadata ? { metadata: data.metadata } : {}),
    })
    return this.checkout(result)
  }

  async getCheckout(id: string): Promise<CheckoutSession> {
    const { id: checkoutId } = await parseInput(checkoutIdValidator, { id })
    return this.checkout(await this.request(`/v1/checkout_sessions/${checkoutId}`, 'GET'))
  }

  async expireCheckout(id: string, idempotencyKey: string): Promise<CheckoutSession> {
    const { id: checkoutId, idempotencyKey: key } = await parseInput(checkoutExpiryValidator, {
      id,
      idempotencyKey,
    })
    return this.checkout(
      await this.request(`/v1/checkout_sessions/${checkoutId}/expire`, 'POST', key)
    )
  }

  async refund(
    input: Omit<RefundInput, 'payment'> & { paymentId: string }
  ): Promise<PaymentRefund> {
    const data = await parseInput(refundInputValidator, input)
    const payload = await this.request('/v1/refunds', 'POST', data.idempotencyKey, {
      payment_id: data.paymentId,
      amount: data.amount,
      reason: data.reason === 'requested_by_customer' ? 'others' : data.reason,
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    })
    return this.refundResult(payload)
  }

  async getRefund(id: string): Promise<PaymentRefund> {
    const { id: refundId } = await parseInput(refundIdValidator, { id })
    return this.refundResult(await this.request(`/v1/refunds/${refundId}`, 'GET'))
  }

  private async refundResult(payload: unknown, webhook = false): Promise<PaymentRefund> {
    const { id, attributes } = await parseResponse(refundResponseValidator, payload, webhook)
    if (attributes.livemode !== undefined && attributes.livemode !== this.liveMode)
      invalidResponse(webhook)
    return {
      provider: this.provider,
      id,
      paymentId: attributes.payment_id,
      amount: attributes.amount,
      currency: attributes.currency ?? 'PHP',
      status: attributes.status === 'processing' ? 'pending' : attributes.status,
      liveMode: this.liveMode,
    }
  }

  async parseWebhook(input: WebhookInput): Promise<PaymentEvent> {
    const liveMode = this.liveMode
    const secret = this.config.webhookSecret?.release()
    if (
      !secret ||
      !Number.isSafeInteger(this.config.webhookToleranceSeconds) ||
      this.config.webhookToleranceSeconds <= 0
    ) {
      this.notConfigured()
    }
    const header = Object.entries(input.headers).find(
      ([name]) => name.toLowerCase() === 'paymongo-signature'
    )?.[1]
    if (typeof header !== 'string' || !header) invalidSignature()

    const parts = header.split(',').map((part) => part.trim().split('='))
    const timestamps = parts.filter(([name]) => name === 't')
    const signatures = parts.filter(([name]) => name === (liveMode ? 'li' : 'te'))
    if (timestamps.length !== 1 || signatures.length !== 1) invalidSignature()
    const timestamp = timestamps[0][1]
    const signature = signatures[0][1]
    if (!/^\d+$/.test(timestamp ?? '') || !/^[a-fA-F0-9]{64}$/.test(signature ?? ''))
      invalidSignature()
    const seconds = Number(timestamp)
    if (
      !Number.isSafeInteger(seconds) ||
      Math.abs(Date.now() / 1000 - seconds) > this.config.webhookToleranceSeconds
    ) {
      invalidSignature()
    }

    const body = Buffer.isBuffer(input.rawBody) ? input.rawBody : Buffer.from(input.rawBody, 'utf8')
    const expected = createHmac('sha256', secret).update(`${timestamp}.`).update(body).digest()
    if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) invalidSignature()

    let payload: unknown
    try {
      payload = JSON.parse(body.toString('utf8'))
    } catch {
      invalidResponse(true)
    }
    const envelope = await parseResponse(webhookEnvelopeValidator, payload, true)
    const event = 'attributes' in envelope.data ? envelope.data.attributes : envelope.data
    if (event.livemode !== liveMode) invalidResponse(true)
    const details = {
      id: envelope.data.id ?? null,
      provider: 'paymongo',
      providerType: event.type,
      liveMode,
    }
    if (['payment.refund.updated', 'payment.refunded', 'refund.succeeded'].includes(event.type)) {
      const resource = event.data as {
        id?: unknown
        type?: unknown
        attributes?: Record<string, unknown>
      } | null
      if (resource?.type === 'refund') {
        const { id } = await parseResponse(refundIdValidator, resource, true)
        if (!resource.attributes?.payment_id) {
          return { ...details, type: 'refund.reconcile', refund: { provider: this.provider, id } }
        }
        return {
          ...details,
          type: 'refund.updated',
          refund: await this.refundResult(resource, true),
        }
      }
      const { id } = await parseResponse(paymentIdValidator, resource, true)
      return {
        ...details,
        type: 'payment.refunds_changed',
        payment: { provider: this.provider, id },
      }
    }
    if (event.type !== 'checkout_session.payment.paid') return { ...details, type: 'ignored' }

    const checkout = await this.checkout(event.data, true)
    if (checkout.status !== 'paid') invalidResponse(true)
    return { ...details, type: 'checkout.paid', checkout }
  }

  private async checkout(payload: unknown, webhook = false): Promise<CheckoutSession> {
    const { id, attributes } = await parseResponse(checkoutResponseValidator, payload, webhook)
    if (attributes.livemode !== this.liveMode) invalidResponse(webhook)
    if (
      attributes.payments?.some(
        (payment) =>
          payment.attributes.livemode !== undefined &&
          payment.attributes.livemode !== attributes.livemode
      )
    ) {
      invalidResponse(webhook)
    }
    const payments = (attributes.payments ?? []).map((payment) => ({
      id: payment.id,
      amount: payment.attributes.amount,
      currency: payment.attributes.currency,
      status: payment.attributes.status,
    }))
    return {
      provider: 'paymongo',
      id,
      url: attributes.checkout_url,
      reference: attributes.reference_number ?? null,
      status: payments.some((payment) => payment.status === 'paid')
        ? 'paid'
        : attributes.status === 'expired'
          ? 'expired'
          : 'pending',
      liveMode: attributes.livemode,
      metadata: attributes.metadata ?? {},
      payments,
    }
  }

  get liveMode(): boolean {
    return this.secretKey().startsWith('sk_live_')
  }

  private secretKey(): string {
    const key = this.config.secretKey?.release()
    if (!key || !/^sk_(test|live)_[a-zA-Z0-9_-]+$/.test(key)) this.notConfigured()
    return key
  }

  private notConfigured(): never {
    throw new PaymentException('PayMongo is not configured', {
      code: 'E_PAYMENT_CONFIG',
      status: 503,
    })
  }

  private async request(
    path: string,
    method: 'GET' | 'POST',
    idempotencyKey?: string,
    attributes?: object
  ): Promise<unknown> {
    const key = this.secretKey()
    if (
      !Number.isSafeInteger(this.config.timeoutMs) ||
      this.config.timeoutMs <= 0 ||
      this.config.timeoutMs > 2_147_483_647
    ) {
      this.notConfigured()
    }
    let response: Response
    try {
      response = await this.fetcher(`https://api.paymongo.com${path}`, {
        method,
        headers: {
          Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
          Accept: 'application/json',
          ...(method === 'POST'
            ? { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey! }
            : {}),
        },
        ...(attributes ? { body: JSON.stringify({ data: { attributes } }) } : {}),
        signal: AbortSignal.timeout(this.config.timeoutMs),
        redirect: 'error',
      })
    } catch {
      throw new PaymentException('Payment provider request failed', {
        code: 'E_PAYMENT_TRANSPORT',
        status: 502,
        outcome: 'unknown',
        retryable: true,
      })
    }
    if (!response.ok) {
      throw new PaymentException(
        'Payment provider rejected the request',
        {
          code: 'E_PAYMENT_PROVIDER',
          status: 502,
          outcome: [400, 401, 403, 404, 422, 429].includes(response.status)
            ? 'rejected'
            : 'unknown',
          retryable:
            response.status === 429 ||
            response.status >= 500 ||
            [408, 409].includes(response.status),
        },
        response.status
      )
    }
    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      invalidResponse()
    }
    const result = await parseResponse(apiEnvelopeValidator, payload)
    return result.data
  }
}

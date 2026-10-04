import type {
  CheckoutInput,
  CheckoutSession,
  PaymentAdapter,
  PaymentRefund,
  RefundInput,
} from '#services/payments/payment_service'
import PaymentException from '#exceptions/payment_exception'

export default class FakePaymentAdapter implements PaymentAdapter {
  readonly liveMode = false
  readonly mutationReplayWindowMs = 60 * 60 * 1000
  readonly idempotencyScope = 'fake-account'
  sessions = new Map<string, CheckoutSession>()
  refunds = new Map<string, PaymentRefund>()
  keys = new Map<string, string>()
  calls: string[] = []
  loseCheckoutResponse = false
  loseRefundResponse = false
  rejectRefundOnce = false
  unavailable = false
  constructor(readonly provider = 'sandbox') {}
  async createCheckout(input: CheckoutInput) {
    this.calls.push(`create:${input.idempotencyKey}`)
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
    if (this.unavailable)
      throw new PaymentException('Provider timeout', {
        code: 'E_PAYMENT_TRANSPORT',
        status: 502,
        outcome: 'unknown',
        retryable: true,
      })
    return structuredClone(this.sessions.get(id)!)
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
    return structuredClone(this.refunds.get(id)!)
  }
  async parseWebhook() {
    return {
      id: null,
      provider: this.provider,
      providerType: 'unrelated',
      liveMode: false,
      type: 'ignored' as const,
    }
  }
}

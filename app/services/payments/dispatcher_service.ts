import PaymentException from '#exceptions/payment_exception'
import PaymentService, {
  type CheckoutInput,
  type PaymentAdapter,
  type PaymentReference,
  type RefundInput,
  type WebhookInput,
} from '#services/payments/payment_service'

/** Only this boundary selects adapters; saved references retain their original provider. */
export default class DispatcherService extends PaymentService {
  private readonly adapters: Map<string, PaymentAdapter>

  constructor(
    private readonly defaultProvider: string,
    adapters: PaymentAdapter[]
  ) {
    super()
    this.adapters = new Map()
    for (const adapter of adapters) {
      if (this.adapters.has(adapter.provider)) throw new Error('Duplicate payment adapter')
      this.adapters.set(adapter.provider, adapter)
    }
  }

  getProvider(provider = this.defaultProvider) {
    const adapter = this.adapter(provider)
    return {
      provider: adapter.provider,
      liveMode: adapter.liveMode,
      mutationReplayWindowMs: adapter.mutationReplayWindowMs ?? 0,
      idempotencyScope: adapter.idempotencyScope ?? adapter.provider,
    }
  }

  createCheckout(input: CheckoutInput, provider = this.defaultProvider) {
    return this.adapter(provider).createCheckout(input)
  }

  getCheckout(reference: PaymentReference) {
    return this.adapter(reference.provider).getCheckout(reference.id)
  }

  expireCheckout(reference: PaymentReference, idempotencyKey: string) {
    return this.adapter(reference.provider).expireCheckout(reference.id, idempotencyKey)
  }

  refund({ payment, ...input }: RefundInput) {
    return this.adapter(payment.provider).refund({ ...input, paymentId: payment.id })
  }

  getRefund(reference: PaymentReference) {
    return this.adapter(reference.provider).getRefund(reference.id)
  }

  parseWebhook({ provider, ...input }: WebhookInput & { provider: string }) {
    return this.adapter(provider).parseWebhook(input)
  }

  private adapter(provider: string) {
    const adapter = this.adapters.get(provider)
    if (!adapter) {
      throw new PaymentException('Payment provider is unavailable', {
        code: 'E_PAYMENT_PROVIDER_UNAVAILABLE',
        status: 503,
        outcome: 'not_submitted',
        retryable: false,
      })
    }
    return adapter
  }
}

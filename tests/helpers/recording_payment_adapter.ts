import type {
  CheckoutSession,
  PaymentAdapter,
  PaymentRefund,
} from '#services/payments/payment_service'

/** A payment adapter for `provider` that records every call it receives. */
export function adapter(provider: string) {
  const calls: string[] = []
  const checkout = (id: string): CheckoutSession => ({
    provider,
    id,
    url: 'https://example.com/pay',
    reference: 'order',
    status: 'pending',
    liveMode: false,
    metadata: {},
    payments: [],
  })
  const refund = (id: string, paymentId: string): PaymentRefund => ({
    provider,
    id,
    paymentId,
    amount: 100,
    currency: 'PHP',
    status: 'succeeded',
    liveMode: false,
  })
  const service: PaymentAdapter = {
    provider,
    liveMode: false,
    createCheckout: async (input) => {
      calls.push(`create:${input.reference}`)
      return checkout('opaque-session')
    },
    getCheckout: async (id) => {
      calls.push(`get:${id}`)
      return checkout(id)
    },
    expireCheckout: async (id, key) => {
      calls.push(`expire:${id}:${key}`)
      return { ...checkout(id), status: 'expired' }
    },
    refund: async (input) => {
      calls.push(`refund:${input.paymentId}:${input.idempotencyKey}`)
      return refund('opaque-refund', input.paymentId)
    },
    getRefund: async (id) => {
      calls.push(`getRefund:${id}`)
      return refund(id, 'opaque-payment')
    },
    parseWebhook: async () => {
      calls.push('webhook')
      return { type: 'ignored', id: null, provider, providerType: 'other', liveMode: false }
    },
  }
  return { service, calls }
}

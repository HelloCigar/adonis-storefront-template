export interface CheckoutInput {
  reference: string
  currency: string
  /** Unit prices are integer minor units (PHP centavos), never decimal pesos. */
  items: {
    name: string
    unitAmount: number
    quantity: number
    description?: string
    imageUrl?: string
  }[]
  successUrl: string
  cancelUrl: string
  customer?: { name?: string; email?: string; phone?: string }
  metadata?: Record<string, string>
  /** Reuse this key when retrying the same checkout attempt. */
  idempotencyKey: string
}

export interface CheckoutSession {
  provider: string
  id: string
  url: string
  reference: string | null
  status: 'pending' | 'paid' | 'expired'
  liveMode: boolean
  metadata: Record<string, string>
  payments: {
    id: string
    amount: number
    currency: string
    status: 'pending' | 'paid' | 'failed'
  }[]
}

export interface RefundInput {
  payment: PaymentReference
  /** Integer minor units, including for partial refunds. */
  amount: number
  currency: string
  reason: 'duplicate' | 'fraudulent' | 'requested_by_customer'
  notes?: string
  idempotencyKey: string
}

export interface PaymentRefund {
  provider: string
  id: string
  paymentId: string
  amount: number
  currency: string
  status: 'pending' | 'succeeded' | 'failed'
  liveMode: boolean
}

export interface WebhookInput {
  /** The exact, unmodified HTTP body; do not stringify parsed JSON. */
  rawBody: string | Buffer
  headers: Record<string, string | string[] | undefined>
}

interface EventDetails {
  /** Some provider envelopes omit an event ID; deduplicate by payment ID then. */
  id: string | null
  provider: string
  providerType: string
  liveMode: boolean
}

export type PaymentEvent =
  | (EventDetails & { type: 'checkout.paid'; checkout: CheckoutSession })
  | (EventDetails & { type: 'refund.updated'; refund: PaymentRefund })
  | (EventDetails & { type: 'refund.reconcile'; refund: PaymentReference })
  | (EventDetails & { type: 'payment.refunds_changed'; payment: PaymentReference })
  | (EventDetails & { type: 'ignored' })

/** Adapter protocol: the dispatcher removes provider routing before delegation. */
export interface PaymentAdapter {
  readonly provider: string
  readonly liveMode: boolean
  /** Conservative window for safely replaying an uncertain mutation. Zero disables replay. */
  readonly mutationReplayWindowMs?: number
  /** Opaque credential/account scope; a change disables replay of old unknown requests. */
  readonly idempotencyScope?: string
  createCheckout(input: CheckoutInput): Promise<CheckoutSession>
  getCheckout(id: string): Promise<CheckoutSession>
  expireCheckout(id: string, idempotencyKey: string): Promise<CheckoutSession>
  refund(input: Omit<RefundInput, 'payment'> & { paymentId: string }): Promise<PaymentRefund>
  getRefund(id: string): Promise<PaymentRefund>
  parseWebhook(input: WebhookInput): Promise<PaymentEvent>
}

/** Runtime DI token: import this class as a value in @inject() consumers. */
export default abstract class PaymentService {
  abstract getProvider(provider?: string): PaymentProviderDetails
  abstract createCheckout(input: CheckoutInput, provider?: string): Promise<CheckoutSession>
  abstract getCheckout(reference: PaymentReference): Promise<CheckoutSession>
  abstract expireCheckout(
    reference: PaymentReference,
    idempotencyKey: string
  ): Promise<CheckoutSession>
  abstract refund(input: RefundInput): Promise<PaymentRefund>
  abstract getRefund(reference: PaymentReference): Promise<PaymentRefund>
  abstract parseWebhook(input: WebhookInput & { provider: string }): Promise<PaymentEvent>
}
/** Provider identifiers are opaque outside the adapter. */
export interface PaymentReference {
  provider: string
  id: string
}

export interface PaymentProviderDetails {
  provider: string
  liveMode: boolean
  mutationReplayWindowMs: number
  idempotencyScope: string
}

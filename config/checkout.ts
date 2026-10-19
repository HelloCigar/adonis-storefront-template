import env from '#start/env'

const checkoutConfig = {
  currency: 'PHP' as const,
  flatShippingAmountMinor: 10_000,
  reservationTtlMs: 15 * 60 * 1000,
  /** Recent order grants and submission keys kept in the (possibly cookie-backed) session. */
  sessionEntryLimit: 5,
  publicUrl: env.get('APP_URL'),
  /** How long a signed-in customer's cart sits untouched before its one reminder is sent. */
  cartReminderDelayMs: 4 * 60 * 60 * 1000,
  /** Carts idle longer than this get no reminder; one that late would feel out of the blue. */
  cartReminderMaxIdleMs: 7 * 24 * 60 * 60 * 1000,
}

export default checkoutConfig

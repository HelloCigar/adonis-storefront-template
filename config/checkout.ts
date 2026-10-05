import env from '#start/env'

const checkoutConfig = {
  currency: 'PHP' as const,
  flatShippingAmountMinor: 10_000,
  reservationTtlMs: 15 * 60 * 1000,
  /** Recent order grants and submission keys kept in the (possibly cookie-backed) session. */
  sessionEntryLimit: 5,
  publicUrl: env.get('APP_URL'),
}

export default checkoutConfig

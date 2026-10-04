import env from '#start/env'

const checkoutConfig = {
  currency: 'PHP' as const,
  flatShippingAmountMinor: 10_000,
  reservationTtlMs: 15 * 60 * 1000,
  publicUrl: env.get('APP_URL'),
}

export default checkoutConfig

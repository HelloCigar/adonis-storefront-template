import RefundObservation from '#models/payments/refund_observation'

export const payment = {
  provider: 'balance-test',
  liveMode: false,
  externalId: 'pay_1',
  amountMinor: 59_900,
  currency: 'PHP',
}

export function observation(
  state: 'pending' | 'succeeded' | 'failed',
  amountMinor: number,
  currency = 'PHP'
) {
  return new RefundObservation().merge({
    provider: payment.provider,
    liveMode: payment.liveMode,
    externalPaymentId: payment.externalId,
    externalId: `ref_${state}_${amountMinor}_${currency}`,
    state,
    amountMinor,
    currency,
  })
}

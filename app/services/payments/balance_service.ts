import { inject } from '@adonisjs/core'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import RefundObservation from '#models/payments/refund_observation'
import MoneyService from '#services/checkout/money_service'

/** A captured payment identified the way providers report refunds against it. */
export interface CapturedPayment {
  provider: string
  liveMode: boolean
  externalId: string
  amountMinor: number
  currency: string
}

/** Refunds the provider has reported against one captured payment. */
export interface PaymentBalance {
  /** Every reported refund, including failed ones. */
  observations: RefundObservation[]
  /** Confirmed refunds in the payment's own currency. */
  refundedMinor: number
  /** What a full refund would still return; never negative. */
  remainingMinor: number
  /** A reported refund has not reached a final state. */
  pending: boolean
  /** A live (non-failed) refund uses a different currency than the payment. */
  currencyMismatch: boolean
  /** Confirmed refunds exceed the captured amount. */
  overRefunded: boolean
  /** Any live (non-failed) refund exists, confirmed or not. */
  active: boolean
}

/**
 * The single source for refund arithmetic. Callers decide what a balance permits:
 * refund requests reject pending or mismatched balances, dispatch treats any live
 * refund as a blocker, and settlement uses the totals to set financial status.
 */
@inject()
export default class BalanceService {
  constructor(private money: MoneyService) {}

  async forPayment(trx: TransactionClientContract, payment: CapturedPayment) {
    const observations = await RefundObservation.query({ client: trx }).where({
      provider: payment.provider,
      liveMode: payment.liveMode,
      externalPaymentId: payment.externalId,
    })
    return this.summarize(payment, observations)
  }

  /** Loads every payment's refunds in one query, keyed by the payment object passed in. */
  async forPayments<T extends CapturedPayment>(trx: TransactionClientContract, payments: T[]) {
    const balances = new Map<T, PaymentBalance>()
    if (!payments.length) return balances
    const observations = await RefundObservation.query({ client: trx }).where((query) => {
      for (const payment of payments)
        query.orWhere({
          provider: payment.provider,
          liveMode: payment.liveMode,
          externalPaymentId: payment.externalId,
        })
    })
    for (const payment of payments)
      balances.set(
        payment,
        this.summarize(
          payment,
          observations.filter(
            (row) =>
              row.provider === payment.provider &&
              row.liveMode === payment.liveMode &&
              row.externalPaymentId === payment.externalId
          )
        )
      )
    return balances
  }

  summarize(payment: CapturedPayment, observations: RefundObservation[]): PaymentBalance {
    const live = observations.filter((row) => row.state !== 'failed')
    const refundedMinor = live
      .filter((row) => row.state === 'succeeded' && row.currency === payment.currency)
      .reduce((total, row) => this.money.add(total, row.amountMinor), 0)
    return {
      observations,
      refundedMinor,
      remainingMinor: Math.max(0, payment.amountMinor - refundedMinor),
      pending: live.some((row) => row.state === 'pending'),
      currencyMismatch: live.some((row) => row.currency !== payment.currency),
      overRefunded: refundedMinor > payment.amountMinor,
      active: live.length > 0,
    }
  }
}

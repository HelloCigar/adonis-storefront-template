import { inject } from '@adonisjs/core'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Order from '#models/checkout/order'
import RefundObservation from '#models/payments/refund_observation'
import FulfillmentService from '#services/checkout/fulfillment_service'
import MoneyService from '#services/checkout/money_service'

@inject()
export default class OrderOperationsService {
  constructor(
    private fulfillment: FulfillmentService,
    private money: MoneyService
  ) {}

  /** Read alongside the order snapshot. Mutations always recheck their own guards. */
  async read(trx: TransactionClientContract, order: Order) {
    const { blockers, shipment } = await this.fulfillment.inspectDispatch(trx, order)
    const shipped = shipment?.state === 'shipped'
    const activePayment = order.attempts.some((attempt) =>
      ['creating', 'pending', 'unknown', 'closing'].includes(attempt.state)
    )
    const cancellationPending =
      order.attempts.some((attempt) => attempt.closeReason === 'cancelled') &&
      order.lifecycleState === 'pending_payment'
    const canCancel =
      order.source === 'online' &&
      !shipped &&
      !cancellationPending &&
      (order.lifecycleState === 'pending_payment' ||
        (['confirmed', 'review_required'].includes(order.lifecycleState) && !activePayment))
    const observedRefunds: {
      id: number
      paymentId: number
      externalId: string
      state: string
      amountMinor: number
      currency: string
    }[] = []
    const payments = []
    let cancellationRefundBlocker: string | null = null
    const allObservations = order.payments.length
      ? await RefundObservation.query({ client: trx }).where((query) => {
          for (const payment of order.payments)
            query.orWhere({
              provider: payment.provider,
              liveMode: payment.liveMode,
              externalPaymentId: payment.externalId,
            })
        })
      : []
    for (const payment of order.payments) {
      const observations = allObservations.filter(
        (row) =>
          row.provider === payment.provider &&
          row.liveMode === payment.liveMode &&
          row.externalPaymentId === payment.externalId
      )
      const mismatched = observations.some(
        (row) => row.state !== 'failed' && row.currency !== payment.currency
      )
      const refunded = observations
        .filter((row) => row.state === 'succeeded' && row.currency === payment.currency)
        .reduce((total, row) => this.money.add(total, row.amountMinor), 0)
      const remaining = Math.max(0, payment.amountMinor - refunded)
      const observedPending = observations.some((row) => row.state === 'pending')
      const existingRefund = order.refunds.some(
        (row) =>
          row.paymentId === payment.id && ['requested', 'pending', 'unknown'].includes(row.state)
      )
      const pending = observedPending || existingRefund
      if (!existingRefund && (mismatched || observedPending || refunded > payment.amountMinor))
        cancellationRefundBlocker = 'Reconcile the provider refund before cancelling this order.'
      const reason = shipped
        ? 'Shipped orders cannot be refunded here.'
        : mismatched
          ? 'A provider refund has a different currency. Review the original payment records.'
          : pending
            ? 'A refund is already in progress for this payment.'
            : !remaining
              ? 'This payment has already been fully refunded.'
              : null
      payments.push({
        paymentId: payment.id,
        canRefund: order.source === 'online' && !reason,
        refundableAmountMinor: remaining,
        refundBlocker: reason,
      })
      for (const row of observations.filter((observation) => !observation.refundOperationId))
        observedRefunds.push({
          id: row.id,
          paymentId: payment.id,
          externalId: row.externalId,
          state: row.state,
          amountMinor: row.amountMinor,
          currency: row.currency,
        })
    }
    return {
      canPack: !blockers.length && shipment?.state === 'pending',
      canShip: !blockers.length && shipment?.state === 'packing',
      blockers,
      canCancel:
        canCancel && (order.lifecycleState === 'pending_payment' || !cancellationRefundBlocker),
      cancellationPending,
      cancelBlocker:
        canCancel && order.lifecycleState !== 'pending_payment' && cancellationRefundBlocker
          ? cancellationRefundBlocker
          : !canCancel && !shipped && activePayment && order.lifecycleState !== 'pending_payment'
            ? 'Reconcile or close the uncertain payment before cancelling this order.'
            : null,
      payments,
      observedRefunds,
    }
  }
}

export type OrderOperations = Awaited<ReturnType<OrderOperationsService['read']>>

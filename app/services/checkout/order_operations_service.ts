import { inject } from '@adonisjs/core'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Order from '#models/checkout/order'
import StockReservation from '#models/checkout/stock_reservation'
import FulfillmentService, { type DispatchBlocker } from '#services/checkout/fulfillment_service'
import BalanceService from '#services/payments/balance_service'

export type OrderIssueCause = 'payment' | 'refund' | 'inventory' | 'shipment'
export type OrderIssueFix =
  'reconcile_checkout' | 'review_payment' | 'review_refunds' | 'check_stock' | 'contact_admin'

/** One cause of blocked fulfillment, with the place staff resolve it. */
export interface OrderIssue {
  cause: OrderIssueCause
  title: string
  detail: string
  fix: OrderIssueFix
  /** A recorded review reason that the title and detail do not already state. */
  note: string | null
  products: { id: number; title: string }[]
}

@inject()
export default class OrderOperationsService {
  constructor(
    private fulfillment: FulfillmentService,
    private balances: BalanceService
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
    const balances = await this.balances.forPayments(trx, order.payments)
    for (const payment of order.payments) {
      const balance = balances.get(payment)!
      const observations = balance.observations
      const mismatched = balance.currencyMismatch
      const remaining = balance.remainingMinor
      const observedPending = balance.pending
      const existingRefund = order.refunds.some(
        (row) =>
          row.paymentId === payment.id && ['requested', 'pending', 'unknown'].includes(row.state)
      )
      const pending = observedPending || existingRefund
      if (!existingRefund && (mismatched || observedPending || balance.overRefunded))
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
    const cancellable =
      canCancel && (order.lifecycleState === 'pending_payment' || !cancellationRefundBlocker)
    return {
      canPack: !blockers.length && shipment?.state === 'pending',
      canShip: !blockers.length && shipment?.state === 'packing',
      issues: this.issues(order, blockers),
      canCancel: cancellable,
      cancellation: cancellable ? await this.cancellation(trx, order, payments) : null,
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

  /** Groups dispatch blockers by cause, root cause first, so the page can lead with one fix. */
  private issues(order: Order, blockers: DispatchBlocker[]): OrderIssue[] {
    const codes = new Set(blockers.map((blocker) => blocker.code))
    const issues: OrderIssue[] = []
    const reconcilable = !!order.attempts.find(
      (attempt) => attempt.needsReview && attempt.state !== 'paid'
    )
    if (codes.has('checkout_review') && reconcilable)
      issues.push({
        cause: 'payment',
        title: 'Reconcile the payment checkout',
        detail:
          'The provider’s payment result is uncertain. Reconciling checks this checkout with the provider; it never marks the order paid on its own.',
        fix: 'reconcile_checkout',
        note: codes.has('order_review') ? order.reviewReason : null,
        products: [],
      })
    else if (codes.has('order_review') || codes.has('checkout_review'))
      issues.push({
        cause: 'payment',
        title: 'Review the payment',
        detail:
          blockers.find((blocker) => blocker.code === 'order_review')?.message ??
          'A payment is recorded, but its checkout still needs review against the provider record.',
        fix: 'review_payment',
        note: null,
        products: [],
      })
    else if (codes.has('unpaid') || codes.has('unconfirmed'))
      issues.push({
        cause: 'payment',
        title: 'No verified payment yet',
        detail: 'Packing starts after the provider confirms a full payment for this order.',
        fix: 'review_payment',
        note: null,
        products: [],
      })
    if (codes.has('refund') || codes.has('provider_refund'))
      issues.push({
        cause: 'refund',
        title: codes.has('refund')
          ? 'A refund is open on this payment'
          : 'The provider reported a refund',
        detail: 'Dispatch stays blocked while money is being returned to the customer.',
        fix: 'review_refunds',
        note: null,
        products: [],
      })
    if (codes.has('inventory')) {
      const products = new Map<number, string>()
      for (const item of order.lineItems ?? [])
        if (item.productId) products.set(item.productId, item.title)
      issues.push({
        cause: 'inventory',
        title: 'Stock is no longer held for this order',
        detail:
          'Its reserved items were released or restocked, so they cannot be shipped from this order. Check stock before deciding whether to cancel.',
        fix: 'check_stock',
        note: null,
        products: [...products].map(([id, title]) => ({ id, title })),
      })
    }
    if (codes.has('shipment'))
      issues.push({
        cause: 'shipment',
        title: 'This order has no shipment record',
        detail:
          'It cannot be packed or shipped from this page. Ask an administrator to check it against the checkout operations guide.',
        fix: 'contact_admin',
        note: null,
        products: [],
      })
    return issues
  }

  /** What cancelling would do now, mirroring FulfillmentService.cancel and RecoveryService. */
  private async cancellation(
    trx: TransactionClientContract,
    order: Order,
    payments: { paymentId: number; refundableAmountMinor: number }[]
  ) {
    const reservations = await StockReservation.query({ client: trx }).where('order_id', order.id)
    const held = reservations
      .filter((row) => row.state === 'reserved')
      .reduce((total, row) => total + row.quantity, 0)
    const consumed = reservations
      .filter((row) => row.state === 'consumed' && !row.restockedAt)
      .reduce((total, row) => total + row.quantity, 0)
    const refunds = []
    for (const payment of order.payments) {
      const existing = order.refunds.find(
        (row) =>
          row.paymentId === payment.id && ['requested', 'pending', 'unknown'].includes(row.state)
      )
      const remaining =
        payments.find((row) => row.paymentId === payment.id)?.refundableAmountMinor ?? 0
      if (existing || remaining > 0)
        refunds.push({
          paymentId: payment.id,
          provider: payment.provider,
          amountMinor: existing ? existing.amountMinor : remaining,
          currency: payment.currency,
          existing: !!existing,
        })
    }
    return {
      closesCheckout: order.lifecycleState === 'pending_payment',
      refunds,
      returnedQuantity: held + consumed,
    }
  }
}

export type OrderOperations = Awaited<ReturnType<OrderOperationsService['read']>>

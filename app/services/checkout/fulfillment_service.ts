import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Order from '#models/checkout/order'
import User from '#models/account/user'
import Shipment from '#models/checkout/shipment'
import Attempt from '#models/payments/attempt'
import Payment from '#models/payments/payment'
import InventoryService from '#services/catalog/inventory_service'
import StateService from '#services/checkout/state_service'
import ActivityService from '#services/checkout/activity_service'
import NotificationIntentService from '#services/checkout/notification_intent_service'
import CheckoutException from '#exceptions/checkout_exception'
import RefundService from '#services/payments/refund_service'
import BalanceService from '#services/payments/balance_service'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export type DispatchBlockerCode =
  | 'order_review'
  | 'unconfirmed'
  | 'unpaid'
  | 'checkout_review'
  | 'refund'
  | 'provider_refund'
  | 'inventory'
  | 'shipment'
  | 'manual'

export interface DispatchBlocker {
  code: DispatchBlockerCode
  message: string
}

@inject()
export default class FulfillmentService {
  constructor(
    private inventory: InventoryService,
    private states: StateService,
    private activities: ActivityService,
    private notifications: NotificationIntentService,
    private refunds: RefundService,
    private balances: BalanceService
  ) {}

  async pack(orderId: number, actor: User) {
    this.staff(actor)
    return db.transaction(async (trx) => {
      const order = await this.claimOrder(trx, orderId)
      const shipment = await this.shippable(trx, order)
      if (shipment.state === 'packing') return shipment
      shipment.state = this.states.transition('shipment', shipment.state, 'packing')
      shipment.actorId = actor.id
      shipment.packingAt = DateTime.utc()
      await shipment.save()
      await this.activities.record(trx, orderId, 'shipment.packing', {}, actor.id)
      return shipment
    })
  }

  async ship(
    orderId: number,
    actor: User,
    details: { carrier: string; trackingNumber: string; trackingUrl?: string }
  ) {
    this.staff(actor)
    if (details.trackingUrl && !['http:', 'https:'].includes(new URL(details.trackingUrl).protocol))
      throw new CheckoutException('Tracking URL must use HTTP or HTTPS', 'E_SHIPMENT_URL', 422)
    return db.transaction(async (trx) => {
      const order = await this.claimOrder(trx, orderId)
      const current = await Shipment.query({ client: trx }).where('order_id', orderId).firstOrFail()
      if (current.state === 'shipped') {
        if (
          current.carrier !== details.carrier ||
          current.trackingNumber !== details.trackingNumber ||
          current.trackingUrl !== (details.trackingUrl ?? null)
        )
          throw new CheckoutException(
            'Shipment already recorded with different tracking details',
            'E_SHIPMENT_REPLAY'
          )
        return current
      }
      const shipment = await this.shippable(trx, order)
      shipment.state = this.states.transition('shipment', shipment.state, 'shipped')
      shipment.merge({
        ...details,
        trackingUrl: details.trackingUrl ?? null,
        actorId: actor.id,
        shippedAt: DateTime.utc(),
      })
      await shipment.save()
      order.fulfillmentStatus = 'fulfilled'
      await order.save()
      await this.activities.record(
        trx,
        orderId,
        'shipment.shipped',
        { shipmentId: shipment.id },
        actor.id
      )
      await this.notifications.record(trx, orderId, 'shipment')
      return shipment
    })
  }

  async cancel(orderId: number, actor: User) {
    this.staff(actor)
    return db.transaction(async (trx) => {
      const order = await this.claimOrder(trx, orderId)
      if (order.lifecycleState === 'cancelled') return order
      if (!['confirmed', 'review_required'].includes(order.lifecycleState))
        throw new CheckoutException(
          'Close an unpaid checkout before cancelling it',
          'E_ORDER_CANCEL'
        )
      const shipment = await Shipment.query({ client: trx }).where('order_id', orderId).first()
      if (shipment?.state === 'shipped')
        throw new CheckoutException('A shipped order cannot be cancelled', 'E_ORDER_CANCEL_SHIPPED')
      const active = await Attempt.query({ client: trx })
        .where('order_id', orderId)
        .whereIn('state', ['creating', 'pending', 'unknown', 'closing'])
        .first()
      if (active)
        throw new CheckoutException(
          'The payment must be reconciled or closed before cancellation',
          'E_ORDER_CANCEL_PAYMENT'
        )
      await this.inventory.restock(trx, orderId)
      await this.inventory.release(trx, orderId)
      order.lifecycleState = this.states.transition('order', order.lifecycleState, 'cancelled')
      order.cancelledAt = DateTime.utc()
      await order.save()
      if (shipment) {
        shipment.state = this.states.transition('shipment', shipment.state, 'cancelled')
        await shipment.save()
      }
      await this.activities.record(trx, orderId, 'order.cancelled', {}, actor.id)
      for (const payment of await Payment.query({ client: trx }).where('order_id', orderId)) {
        try {
          await this.refunds.requestFullWithin(trx, orderId, actor, payment.id)
        } catch (error) {
          if (!(error instanceof CheckoutException) || error.code !== 'E_REFUND_BALANCE')
            throw error
        }
      }
      return order
    })
  }

  private staff(actor: User) {
    CheckoutException.assertStaff(actor, 'E_FULFILLMENT_ACCESS')
  }
  private async claimOrder(trx: TransactionClientContract, orderId: number) {
    await Order.query({ client: trx }).where('id', orderId).increment('version', 1)
    const order = await Order.findOrFail(orderId, { client: trx })
    if (order.source !== 'online')
      throw new CheckoutException('Use the legacy order controls', 'E_ORDER_LEGACY')
    return order
  }
  /** The detail page and mutations share the same dispatch prerequisites. */
  async inspectDispatch(trx: TransactionClientContract, order: Order) {
    // Order rows are loaded inside `trx`, so their relation queries run in it too.
    const payment = await order.related('payments').query().where('disposition', 'accepted').first()
    const blockedAttempt = await order
      .related('attempts')
      .query()
      .where('needs_review', true)
      .first()
    const refund = payment
      ? await order
          .related('refunds')
          .query()
          .where('payment_id', payment.id)
          .whereNot('state', 'failed')
          .first()
      : null
    const invalidStock = await order
      .related('stockReservations')
      .query()
      .where((q) => q.whereNot('state', 'consumed').orWhereNotNull('restocked_at'))
      .first()
    const balance = payment ? await this.balances.forPayment(trx, payment) : null
    const observedRefund = !!balance?.active
    const shipment = await order.related('shipments').query().first()
    const blockers: DispatchBlocker[] = []
    if (order.lifecycleState === 'review_required')
      blockers.push({
        code: 'order_review',
        message: order.reviewReason || 'Review this order’s payment before fulfillment.',
      })
    else if (order.lifecycleState !== 'confirmed')
      blockers.push({
        code: 'unconfirmed',
        message: 'The order must be confirmed before fulfillment.',
      })
    if (order.financialStatus !== 'paid' || !payment)
      blockers.push({
        code: 'unpaid',
        message: 'A verified full payment is required before packing or dispatch.',
      })
    if (blockedAttempt)
      blockers.push({
        code: 'checkout_review',
        message: 'Reconcile the payment checkout before dispatch.',
      })
    if (refund)
      blockers.push({
        code: 'refund',
        message: 'A refund is in progress or confirmed. Dispatch is blocked.',
      })
    if (observedRefund)
      blockers.push({
        code: 'provider_refund',
        message: 'The provider has reported a refund. Review its status before dispatch.',
      })
    if (invalidStock)
      blockers.push({
        code: 'inventory',
        message: 'Inventory is no longer allocated for dispatch.',
      })
    if (!shipment)
      blockers.push({
        code: 'shipment',
        message: 'No shipment record is available for this order.',
      })
    if (order.source !== 'online')
      blockers.push({ code: 'manual', message: 'Use the manual order controls for this order.' })
    return { blockers, shipment }
  }

  private async shippable(trx: TransactionClientContract, order: Order) {
    const { blockers, shipment } = await this.inspectDispatch(trx, order)
    if (blockers.length || !shipment)
      throw new CheckoutException(
        'Payment, inventory, or review status prevents shipment',
        'E_ORDER_NOT_SHIPPABLE'
      )
    return shipment
  }
}

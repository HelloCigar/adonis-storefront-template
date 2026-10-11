import Order from '#models/checkout/order'
import type { DateTime } from 'luxon'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

type OrderQuery = ModelQueryBuilderContract<typeof Order>

/** Queue tabs on the staff order list, in the order staff work through them. */
export const orderStages = [
  'to_pack',
  'to_ship',
  'in_transit',
  'delivered',
  'needs_attention',
] as const
export type OrderStage = (typeof orderStages)[number]

/** What staff do next for one order, most urgent first when an order sits in several stages. */
export type OrderNextStep =
  | 'review_payment'
  | 'add_tracking'
  | 'pack'
  | 'confirm_delivery'
  | 'await_payment'
  | 'closed'
  | 'done'
  | 'none'

export interface OrderQueueItem {
  order: Order
  stages: OrderStage[]
  nextStep: OrderNextStep
  /** When the order started waiting on its next step; null once nothing waits on staff. */
  waitingSince: DateTime | null
}

/**
 * Sorts orders into the fulfillment queue that the order list and the dashboard home share.
 * Stages are a summary only: the order page and its workflow services still enforce their own
 * payment, stock, and shipment guards before anything changes.
 */
export default class OrderQueueService {
  /** Paid orders whose parcel has not been packed yet, including manually recorded orders. */
  toPack(query: OrderQuery) {
    query.where((scope) =>
      scope
        .where((online) =>
          online
            .where('source', 'online')
            .where('lifecycle_state', 'confirmed')
            .where('financial_status', 'paid')
            .whereHas('shipments', (shipments) => shipments.where('state', 'pending'))
        )
        .orWhere((manual) =>
          manual
            .where('source', 'legacy')
            .where('financial_status', 'paid')
            .whereIn('fulfillment_status', ['unfulfilled', 'partial'])
            .whereNull('cancelled_at')
        )
    )
  }

  /** Packed parcels waiting for a carrier and tracking details. */
  toShip(query: OrderQuery) {
    query
      .where('source', 'online')
      .whereHas('shipments', (shipments) => shipments.where('state', 'packing'))
  }

  /** Dispatched parcels the carrier has not confirmed as delivered yet. */
  inTransit(query: OrderQuery) {
    query
      .where('source', 'online')
      .whereHas('shipments', (shipments) => shipments.where('state', 'shipped'))
  }

  /** Delivered parcels, and manually recorded orders staff marked fulfilled. */
  delivered(query: OrderQuery) {
    query.where((scope) =>
      scope
        .where((online) =>
          online
            .where('source', 'online')
            .whereHas('shipments', (shipments) => shipments.where('state', 'delivered'))
        )
        .orWhere((manual) =>
          manual
            .where('source', 'legacy')
            .where('fulfillment_status', 'fulfilled')
            .whereNull('cancelled_at')
        )
    )
  }

  /** Orders whose payment or refund outcome needs a person to reconcile it. */
  needsAttention(query: OrderQuery) {
    query.where((scope) =>
      scope
        .where('lifecycle_state', 'review_required')
        .orWhereHas('attempts', (attempts) =>
          attempts.where('needs_review', true).whereNot('state', 'paid')
        )
        .orWhereHas('refunds', (refunds) =>
          refunds.where((refund) => refund.where('needs_review', true).orWhere('state', 'unknown'))
        )
    )
  }

  scope(stage: OrderStage, query: OrderQuery) {
    const scopes = {
      to_pack: this.toPack,
      to_ship: this.toShip,
      in_transit: this.inTransit,
      delivered: this.delivered,
      needs_attention: this.needsAttention,
    } satisfies Record<OrderStage, (query: OrderQuery) => void>
    scopes[stage].call(this, query)
    return query
  }

  /** Every order, newest first, with the stages it belongs to and its next step. */
  async list(): Promise<OrderQueueItem[]> {
    const [orders, ...members] = await Promise.all([
      Order.query()
        .preload('user')
        .preload('shipments')
        .orderBy('processed_at', 'desc')
        .orderBy('id', 'desc'),
      ...orderStages.map((stage) => this.scope(stage, Order.query().select('id'))),
    ])
    const ids = new Map(
      orderStages.map((stage, index) => [stage, new Set(members[index].map((order) => order.id))])
    )
    return orders.map((order) =>
      this.describe(
        order,
        orderStages.filter((stage) => ids.get(stage)!.has(order.id))
      )
    )
  }

  /** One order's stages and next step, matching its row in the list. Expects shipments loaded. */
  async forOrder(order: Order): Promise<OrderQueueItem> {
    const matches = await Promise.all(
      orderStages.map((stage) =>
        this.scope(stage, Order.query().select('id')).where('id', order.id).first()
      )
    )
    return this.describe(
      order,
      orderStages.filter((_, index) => matches[index])
    )
  }

  private describe(order: Order, stages: OrderStage[]): OrderQueueItem {
    const nextStep = this.nextStep(order, stages)
    return { order, stages, nextStep, waitingSince: this.waitingSince(order, nextStep) }
  }

  private nextStep(order: Order, stages: OrderStage[]): OrderNextStep {
    if (stages.includes('needs_attention')) return 'review_payment'
    if (stages.includes('to_ship')) return 'add_tracking'
    if (stages.includes('to_pack')) return 'pack'
    if (stages.includes('in_transit')) return 'confirm_delivery'
    if (stages.includes('delivered')) return 'done'
    if (
      order.cancelledAt ||
      ['cancelled', 'expired'].includes(order.lifecycleState) ||
      ['refunded', 'voided'].includes(order.financialStatus)
    )
      return 'closed'
    if (order.lifecycleState === 'pending_payment' || order.financialStatus === 'pending')
      return 'await_payment'
    return 'none'
  }

  private waitingSince(order: Order, step: OrderNextStep) {
    const shipment = order.shipments[0]
    switch (step) {
      case 'review_payment':
        return order.updatedAt
      case 'pack':
        return order.paidAt ?? order.processedAt
      case 'add_tracking':
        return shipment?.packingAt ?? null
      case 'confirm_delivery':
        return shipment?.shippedAt ?? null
      case 'await_payment':
        return order.processedAt
      default:
        return null
    }
  }
}

import { BaseTransformer } from '@adonisjs/core/transformers'
import type { OrderQueueItem } from '#services/seller/order_queue_service'

/** One row of the staff order queue: summary fields plus its stages and next step. */
export default class OrderQueueItemTransformer extends BaseTransformer<OrderQueueItem> {
  toObject() {
    const { order, stages, nextStep, waitingSince } = this.resource
    return {
      ...this.pick(order, [
        'id',
        'number',
        'email',
        'currencyCode',
        'financialStatus',
        'fulfillmentStatus',
        'totalAmount',
        'processedAt',
        'source',
        'lifecycleState',
      ]),
      customer: order.user?.fullName?.trim() || null,
      stages,
      nextStep,
      waitingSince: waitingSince?.toISO() ?? null,
    }
  }
}

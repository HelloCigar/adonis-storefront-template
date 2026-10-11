import type { HttpContext } from '@adonisjs/core/http'
import Order from '#models/checkout/order'
import SellerOrderTransformer from '#transformers/seller/order_transformer'
import { orderUpdateValidator } from '#validators/seller/order'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import OrderOperationsService from '#services/checkout/order_operations_service'
import SellerOrderService from '#services/seller/order_service'
import OrderOperationsTransformer from '#transformers/seller/order_operations_transformer'
import OrderChatService from '#services/chat/order_chat_service'
import OrderQueueService, {
  orderStages,
  type OrderStage,
} from '#services/seller/order_queue_service'
import OrderQueueItemTransformer from '#transformers/seller/order_queue_item_transformer'

@inject()
export default class OrdersController {
  constructor(
    private operations: OrderOperationsService,
    private orders: SellerOrderService,
    private chat: OrderChatService,
    private queue: OrderQueueService
  ) {}

  async index({ inertia, bouncer, request }: HttpContext) {
    await bouncer.with('SellerOrderPolicy').authorize('viewAny')
    // An unknown tab in a shared or stale link falls back to the start of the queue.
    const requested = request.qs().stage
    const stage: OrderStage | 'all' =
      requested === 'all' || orderStages.includes(requested) ? requested : 'to_pack'
    return inertia.render('seller/orders', {
      orders: OrderQueueItemTransformer.transform(await this.queue.list()),
      stage,
    })
  }
  async show({ params, inertia, bouncer }: HttpContext) {
    const { order, operations } = await db.transaction(async (trx) => {
      const snapshot = await Order.query({ client: trx })
        .where('id', params.id)
        .preload('addresses')
        .preload('lineItems')
        .preload('attempts', (q) => q.orderBy('id', 'desc'))
        .preload('payments')
        .preload('shipments')
        .preload('refunds')
        .preload('notifications')
        .preload('activities', (q) => q.orderBy('id', 'desc').limit(100).preload('actor'))
        .firstOrFail()
      return {
        order: snapshot,
        operations: snapshot.source === 'online' ? await this.operations.read(trx, snapshot) : null,
      }
    })
    await bouncer.with('SellerOrderPolicy').authorize('view', order)
    return inertia.render('seller/order', {
      order: SellerOrderTransformer.transform(order).depth(3),
      operations: operations ? OrderOperationsTransformer.transform(operations) : null,
      // Guest orders have nobody to message, so they get no chat link.
      chat: async () =>
        (await bouncer.with('ChatOrderPolicy').allows('view', order))
          ? { unreadCount: await this.chat.unreadCount(order) }
          : null,
    })
  }
  async update({ params, request, response, session, bouncer }: HttpContext) {
    const order = await Order.findOrFail(params.id)
    await bouncer.with('SellerOrderPolicy').authorize('update', order)
    await this.orders.update(order, await request.validateUsing(orderUpdateValidator))
    session.flash('success', 'Order updated')
    return response.redirect().toRoute('seller.orders.show', { id: order.id })
  }
}

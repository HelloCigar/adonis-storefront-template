import type { HttpContext } from '@adonisjs/core/http'
import Order from '#models/checkout/order'
import SellerOrderTransformer from '#transformers/seller/order_transformer'
import { orderUpdateValidator } from '#validators/seller/order'
import CheckoutException from '#exceptions/checkout_exception'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import OrderOperationsService from '#services/checkout/order_operations_service'
import OrderOperationsTransformer from '#transformers/seller/order_operations_transformer'

@inject()
export default class OrdersController {
  constructor(private operations: OrderOperationsService) {}
  async index({ inertia, bouncer }: HttpContext) {
    await bouncer.with('SellerOrderPolicy').authorize('viewAny')
    return inertia.render('seller/orders', {
      orders: SellerOrderTransformer.transform(await Order.query().orderBy('processedAt', 'desc')),
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
        .preload('activities', (q) => q.orderBy('id', 'desc').limit(100))
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
    })
  }
  async update({ params, request, response, session, bouncer }: HttpContext) {
    const order = await Order.findOrFail(params.id)
    await bouncer.with('SellerOrderPolicy').authorize('update', order)
    const input = await request.validateUsing(orderUpdateValidator)
    if (
      order.source === 'online' &&
      (input.financialStatus !== order.financialStatus ||
        input.fulfillmentStatus !== order.fulfillmentStatus)
    ) {
      throw new CheckoutException(
        'Use the payment and shipment actions for online orders',
        'E_ONLINE_STATUS_MANUAL'
      )
    }
    await order.merge(order.source === 'online' ? { note: input.note } : input).save()
    session.flash('success', 'Order updated')
    return response.redirect().toRoute('seller.orders.show', { id: order.id })
  }
}

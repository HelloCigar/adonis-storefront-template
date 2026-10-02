import type { HttpContext } from '@adonisjs/core/http'
import Order from '#models/checkout/order'
import SellerOrderTransformer from '#transformers/seller/order_transformer'
import { orderUpdateValidator } from '#validators/seller/order'

export default class OrdersController {
  async index({ inertia }: HttpContext) {
    return inertia.render('seller/orders', {
      orders: SellerOrderTransformer.transform(await Order.query().orderBy('processedAt', 'desc')),
    })
  }
  async show({ params, inertia }: HttpContext) {
    const order = await Order.query()
      .where('id', params.id)
      .preload('addresses')
      .preload('lineItems')
      .firstOrFail()
    return inertia.render('seller/order', {
      order: SellerOrderTransformer.transform(order).depth(3),
    })
  }
  async update({ params, request, response, session }: HttpContext) {
    const order = await Order.findOrFail(params.id)
    await order.merge(await request.validateUsing(orderUpdateValidator)).save()
    session.flash('success', 'Order updated')
    return response.redirect().toRoute('seller.orders.show', { id: order.id })
  }
}

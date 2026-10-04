import Order from '#models/checkout/order'
import OrderTransformer from '#transformers/checkout/order_transformer'
import type { HttpContext } from '@adonisjs/core/http'

export default class OrdersController {
  async index({ auth, inertia, bouncer }: HttpContext) {
    await bouncer.with('AccountOrderPolicy').authorize('viewAny', auth.getUserOrFail())
    return inertia.render('account/orders/index', {
      orders: async () =>
        OrderTransformer.transform(
          await Order.query()
            .where('user_id', auth.user!.id)
            .preload('lineItems')
            .preload('addresses')
            .orderBy('processed_at', 'desc')
        ),
    })
  }

  async show({ auth, params, inertia, bouncer, response }: HttpContext) {
    const order = await Order.query()
      .where('id', params.id)
      .where('user_id', auth.user!.id)
      .preload('lineItems')
      .preload('addresses')
      .firstOrFail()
    await bouncer.with('AccountOrderPolicy').authorize('view', order)
    if (order.source === 'online')
      return response.redirect().toRoute('checkout.orders.show', { publicId: order.publicId! })

    return inertia.render('account/orders/[id]', {
      order: OrderTransformer.transform(order),
    })
  }
}

import Order from '#models/checkout/order'
import OrderTransformer from '#transformers/checkout/order_transformer'
import type { HttpContext } from '@adonisjs/core/http'

export default class OrdersController {
  async index({ auth, inertia }: HttpContext) {
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

  async show({ auth, params, inertia }: HttpContext) {
    const order = await Order.query()
      .where('id', params.id)
      .where('user_id', auth.user!.id)
      .preload('lineItems')
      .preload('addresses')
      .firstOrFail()

    return inertia.render('account/orders/[id]', {
      order: OrderTransformer.transform(order),
    })
  }
}

import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import OrderAccessService from '#services/checkout/order_access_service'
import StatusTransformer from '#transformers/checkout/status_transformer'

@inject()
export default class OrdersController {
  constructor(private access: OrderAccessService) {}
  async show({ params, auth, checkoutSession, inertia, response }: HttpContext) {
    const order = await this.access.authorize(
      params.publicId,
      auth.user?.id,
      checkoutSession.orderGrant(params.publicId)
    )
    await order.load('addresses')
    await order.load('lineItems')
    await order.load('attempts', (q) => q.orderBy('id', 'desc'))
    await order.load('shipments')
    await order.load('refunds', (q) => q.orderBy('id', 'desc'))
    response.header('Cache-Control', 'private, no-store')
    response.header('Referrer-Policy', 'no-referrer')
    return inertia.render('checkout/order', {
      status: StatusTransformer.transform(order).depth(4),
      canClaim: !!auth.user && !order.userId,
    })
  }
}

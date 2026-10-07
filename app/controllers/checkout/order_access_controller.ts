import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import OrderAccessService from '#services/checkout/order_access_service'

@inject()
export default class OrderAccessController {
  constructor(private access: OrderAccessService) {}
  async show({ params, request, checkoutSession, response }: HttpContext) {
    const token = request.input('token')
    const order = await this.access.authorize(
      params.publicId,
      undefined,
      typeof token === 'string' ? token : undefined
    )
    checkoutSession.rememberOrderGrant(order.publicId!, token)
    response.header('Cache-Control', 'private, no-store').header('Referrer-Policy', 'no-referrer')
    return response.redirect().toRoute('checkout.orders.show', { publicId: order.publicId! })
  }
  async store({ params, auth, checkoutSession, session, response }: HttpContext) {
    const userId = auth.getUserOrFail().id
    const grant = checkoutSession.orderGrant(params.publicId)
    const order = await this.access.authorize(params.publicId, userId, grant)
    await this.access.claim(order, userId, grant)
    session.flash('success', 'Order added to your account')
    return response.redirect().toRoute('checkout.orders.show', { publicId: order.publicId! })
  }
}

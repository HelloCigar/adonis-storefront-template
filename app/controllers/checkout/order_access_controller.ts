import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import OrderAccessService from '#services/checkout/order_access_service'

@inject()
export default class OrderAccessController {
  constructor(private access: OrderAccessService) {}
  async show({ params, request, session, response }: HttpContext) {
    const token = request.input('token')
    const order = await this.access.authorize(
      params.publicId,
      undefined,
      typeof token === 'string' ? token : undefined
    )
    const grants = (session.get('store_order_grants') ?? {}) as Record<string, string>
    session.put('store_order_grants', this.access.remember(grants, order.publicId!, token))
    response.header('Cache-Control', 'private, no-store').header('Referrer-Policy', 'no-referrer')
    return response.redirect().toRoute('checkout.orders.show', { publicId: order.publicId! })
  }
  async store({ params, auth, session, response }: HttpContext) {
    const grants = (session.get('store_order_grants') ?? {}) as Record<string, string>
    const order = await this.access.authorize(
      params.publicId,
      auth.user!.id,
      grants[params.publicId]
    )
    await this.access.claim(order, auth.user!.id, grants[params.publicId])
    session.flash('success', 'Order added to your account')
    return response.redirect().toRoute('checkout.orders.show', { publicId: order.publicId! })
  }
}

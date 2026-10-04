import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import Order from '#models/checkout/order'
import FulfillmentService from '#services/checkout/fulfillment_service'

@inject()
export default class PackingController {
  constructor(private fulfillment: FulfillmentService) {}
  async store({ params, auth, bouncer, response, session }: HttpContext) {
    const order = await Order.findOrFail(params.id)
    await bouncer.with('SellerOrderPolicy').authorize('update', order)
    await this.fulfillment.pack(order.id, auth.user!)
    session.flash('success', 'Order is being packed')
    return response.redirect().toRoute('seller.orders.show', { id: order.id })
  }
}

import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import Order from '#models/checkout/order'
import FulfillmentService from '#services/checkout/fulfillment_service'
import { shipmentValidator } from '#validators/checkout/fulfillment'

@inject()
export default class ShipmentsController {
  constructor(private fulfillment: FulfillmentService) {}
  async store({ params, request, auth, bouncer, response, session }: HttpContext) {
    const order = await Order.findOrFail(params.id)
    await bouncer.with('SellerOrderPolicy').authorize('update', order)
    await this.fulfillment.ship(
      order.id,
      auth.getUserOrFail(),
      await request.validateUsing(shipmentValidator)
    )
    session.flash('success', 'Shipment recorded')
    return response.redirect().toRoute('seller.orders.show', { id: order.id })
  }
}

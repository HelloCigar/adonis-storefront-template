import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import Order from '#models/checkout/order'
import RefundService from '#services/payments/refund_service'
import { refundValidator } from '#validators/checkout/fulfillment'

@inject()
export default class RefundsController {
  constructor(private refunds: RefundService) {}
  async store({ params, request, auth, bouncer, response, session }: HttpContext) {
    const order = await Order.findOrFail(params.id)
    await bouncer.with('SellerOrderPolicy').authorize('update', order)
    const { paymentId } = await request.validateUsing(refundValidator)
    await this.refunds.requestFull(order.id, auth.user!, paymentId)
    session.flash('success', 'Refund requested; confirmation is pending')
    return response.redirect().toRoute('seller.orders.show', { id: order.id })
  }
}

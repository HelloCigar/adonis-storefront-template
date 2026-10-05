import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import Order from '#models/checkout/order'
import FulfillmentService from '#services/checkout/fulfillment_service'
import RecoveryService from '#services/payments/recovery_service'

@inject()
export default class CancellationsController {
  constructor(
    private fulfillment: FulfillmentService,
    private recovery: RecoveryService
  ) {}
  async store({ params, auth, bouncer, response, session }: HttpContext) {
    const order = await Order.findOrFail(params.id)
    await bouncer.with('SellerOrderPolicy').authorize('update', order)
    if (order.lifecycleState === 'pending_payment') {
      await this.recovery.requestCancel(order.id)
      session.flash(
        'success',
        'Cancellation requested. Stock stays held until the checkout is confirmed closed.'
      )
    } else {
      await this.fulfillment.cancel(order.id, auth.user!)
      session.flash(
        'success',
        'Order cancelled. Any required refund is queued and awaits provider confirmation.'
      )
    }
    return response.redirect().toRoute('seller.orders.show', { id: order.id })
  }
}

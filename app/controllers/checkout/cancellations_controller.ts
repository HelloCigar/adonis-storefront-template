import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import OrderAccessService from '#services/checkout/order_access_service'
import RecoveryService from '#services/payments/recovery_service'

@inject()
export default class CancellationsController {
  constructor(
    private access: OrderAccessService,
    private recovery: RecoveryService
  ) {}
  async store({ params, auth, checkoutSession, response }: HttpContext) {
    const order = await this.access.authorize(
      params.publicId,
      auth.user?.id,
      checkoutSession.orderGrant(params.publicId)
    )
    await this.recovery.requestCancel(order.id)
    return response.redirect().toRoute('checkout.orders.show', { publicId: order.publicId! })
  }
}

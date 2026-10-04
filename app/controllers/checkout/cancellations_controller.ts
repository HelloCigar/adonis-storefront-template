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
  async store({ params, auth, session, response }: HttpContext) {
    const grants = (session.get('store_order_grants') ?? {}) as Record<string, string>
    const order = await this.access.authorize(
      params.publicId,
      auth.user?.id,
      grants[params.publicId]
    )
    await this.recovery.requestCancel(order.id)
    return response.redirect().toRoute('checkout.orders.show', { publicId: order.publicId! })
  }
}

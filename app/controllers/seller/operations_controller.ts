import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import Order from '#models/checkout/order'
import OperationService from '#services/checkout/operation_service'
import { operationRetryValidator } from '#validators/checkout/fulfillment'

@inject()
export default class OperationsController {
  constructor(private operations: OperationService) {}
  async store({ params, request, auth, bouncer, response, session }: HttpContext) {
    const order = await Order.findOrFail(params.id)
    await bouncer.with('SellerOrderPolicy').authorize('update', order)
    await this.operations.retry(
      order.id,
      auth.user!,
      await request.validateUsing(operationRetryValidator)
    )
    session.flash('success', 'Recovery requested')
    return response.redirect().toRoute('seller.orders.show', { id: order.id })
  }
}

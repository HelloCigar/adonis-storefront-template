import type Order from '#models/checkout/order'
import type { Infer } from '@vinejs/vine/types'
import type { orderUpdateValidator } from '#validators/seller/order'
import CheckoutException from '#exceptions/checkout_exception'
import type { WriteOptions } from '../../../types/write_options.js'

export default class SellerOrderService {
  /**
   * Staff edit manual orders directly. Online order statuses follow payment and shipment
   * workflows, so only their note is editable here.
   */
  async update(
    order: Order,
    payload: Infer<typeof orderUpdateValidator>,
    options: WriteOptions = {}
  ) {
    if (options.client) order.useTransaction(options.client)
    if (order.source !== 'online') {
      await order.merge(payload).save()
      return
    }
    if (
      payload.financialStatus !== order.financialStatus ||
      payload.fulfillmentStatus !== order.fulfillmentStatus
    ) {
      throw new CheckoutException(
        'Use the payment and shipment actions for online orders',
        'E_ONLINE_STATUS_MANUAL'
      )
    }
    await order.merge({ note: payload.note }).save()
  }
}

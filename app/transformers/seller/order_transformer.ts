import { BaseTransformer } from '@adonisjs/core/transformers'
import type Order from '#models/checkout/order'
import OrderAddressTransformer from '#transformers/checkout/order_address_transformer'
import OrderLineItemTransformer from '#transformers/checkout/order_line_item_transformer'

export default class SellerOrderTransformer extends BaseTransformer<Order> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'number',
        'email',
        'phoneNumber',
        'currencyCode',
        'financialStatus',
        'fulfillmentStatus',
        'totalAmount',
        'subtotalAmount',
        'discountAmount',
        'shippingAmount',
        'taxAmount',
        'note',
        'processedAt',
        'cancelledAt',
      ]),
      addresses: OrderAddressTransformer.transform(this.whenLoaded(this.resource.addresses)),
      lineItems: OrderLineItemTransformer.transform(this.whenLoaded(this.resource.lineItems)),
    }
  }
}

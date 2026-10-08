import type Order from '#models/checkout/order'
import type OrderAddress from '#models/checkout/order_address'
import OrderAddressTransformer from '#transformers/checkout/order_address_transformer'
import OrderLineItemTransformer from '#transformers/checkout/order_line_item_transformer'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class OrderTransformer extends BaseTransformer<Order> {
  toObject() {
    const addresses = (this.resource.$preloaded.addresses as OrderAddress[] | undefined) ?? []
    const shippingAddress = addresses.find((address) => address.type === 'shipping')
    const billingAddress = addresses.find((address) => address.type === 'billing')

    return {
      ...this.pick(this.resource, [
        'id',
        'number',
        'email',
        'phoneNumber',
        'currencyCode',
        'financialStatus',
        'fulfillmentStatus',
        'subtotalAmount',
        'discountAmount',
        'discountCode',
        'shippingAmount',
        'taxAmount',
        'totalAmount',
        'note',
        'processedAt',
        'cancelledAt',
        'createdAt',
        'updatedAt',
      ]),
      name: this.resource.number,
      financialStatus: this.resource.financialStatus.toUpperCase(),
      fulfillmentStatus: this.resource.fulfillmentStatus.toUpperCase(),
      subtotal: {
        amount: this.resource.subtotalAmount,
        currencyCode: this.resource.currencyCode,
      },
      totalShipping: {
        amount: this.resource.shippingAmount,
        currencyCode: this.resource.currencyCode,
      },
      totalTax: {
        amount: this.resource.taxAmount,
        currencyCode: this.resource.currencyCode,
      },
      totalPrice: {
        amount: this.resource.totalAmount,
        currencyCode: this.resource.currencyCode,
      },
      shippingAddress: shippingAddress ? OrderAddressTransformer.transform(shippingAddress) : null,
      billingAddress: billingAddress ? OrderAddressTransformer.transform(billingAddress) : null,
      addresses: OrderAddressTransformer.transform(this.whenLoaded(this.resource.addresses)),
      lineItems: OrderLineItemTransformer.transform(this.whenLoaded(this.resource.lineItems)),
    }
  }
}

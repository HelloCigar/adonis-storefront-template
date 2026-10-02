import type OrderLineItem from '#models/checkout/order_line_item'
import ProductTransformer from '#transformers/catalog/product_transformer'
import ProductVariantTransformer from '#transformers/catalog/product_variant_transformer'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class OrderLineItemTransformer extends BaseTransformer<OrderLineItem> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'productId',
        'productVariantId',
        'title',
        'variantTitle',
        'sku',
        'options',
        'quantity',
        'unitPriceAmount',
        'discountAmount',
        'totalAmount',
        'currencyCode',
        'imageUrl',
        'imageAltText',
        'createdAt',
        'updatedAt',
      ]),
      product: ProductTransformer.transform(this.whenLoaded(this.resource.product)),
      variant: ProductVariantTransformer.transform(this.whenLoaded(this.resource.variant)),
      totalPrice: {
        amount: this.resource.totalAmount,
        currencyCode: this.resource.currencyCode,
      },
      image: this.resource.imageUrl
        ? {
            url: this.resource.imageUrl,
            altText: this.resource.imageAltText,
          }
        : null,
    }
  }
}

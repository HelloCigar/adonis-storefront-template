import type CartLine from '#models/checkout/cart_line'
import ProductVariantTransformer from '#transformers/catalog/product_variant_transformer'
import MediaTransformer from '#transformers/shared/media_transformer'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class CartLineTransformer extends BaseTransformer<CartLine> {
  toObject() {
    const variant = this.resource.variant
    const featuredMedia = variant?.featuredMedia
    return {
      ...this.pick(this.resource, [
        'id',
        'productVariantId',
        'quantity',
        'unitPriceAmount',
        'currencyCode',
        'createdAt',
        'updatedAt',
      ]),
      image: featuredMedia ? MediaTransformer.transform(featuredMedia) : null,
      variant: variant ? ProductVariantTransformer.transform(variant).depth(2) : null,
      merchandise: variant ? ProductVariantTransformer.transform(variant).depth(2) : null,
      totalAmount: this.resource.unitPriceAmount * this.resource.quantity,
    }
  }
}

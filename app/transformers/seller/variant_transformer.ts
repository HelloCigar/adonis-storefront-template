import { BaseTransformer } from '@adonisjs/core/transformers'
import type ProductVariant from '#models/catalog/product_variant'

export default class SellerVariantTransformer extends BaseTransformer<ProductVariant> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'title',
        'sku',
        'priceAmount',
        'compareAtPriceAmount',
        'currencyCode',
        'inventoryQuantity',
        'inventoryReservedQuantity',
        'availableForSale',
        'options',
        'featuredMediaId',
        'position',
      ]),
      options: this.resource.safeOptions,
      hasInvalidOptions: this.resource.hasInvalidOptions,
      availableForSale: Boolean(this.resource.availableForSale),
    }
  }
}

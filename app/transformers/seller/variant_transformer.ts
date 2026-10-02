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
        'availableForSale',
        'options',
        'position',
      ]),
      availableForSale: Boolean(this.resource.availableForSale),
    }
  }
}

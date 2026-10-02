import { BaseTransformer } from '@adonisjs/core/transformers'
import type Product from '#models/catalog/product'
import SellerVariantTransformer from '#transformers/seller/variant_transformer'

export default class SellerProductTransformer extends BaseTransformer<Product> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'title',
        'handle',
        'description',
        'vendor',
        'productType',
        'status',
      ]),
      variants: SellerVariantTransformer.transform(this.whenLoaded(this.resource.variants)),
    }
  }
}

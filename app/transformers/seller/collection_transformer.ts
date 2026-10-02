import { BaseTransformer } from '@adonisjs/core/transformers'
import type Collection from '#models/catalog/collection'

export default class SellerCollectionTransformer extends BaseTransformer<Collection> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'handle', 'description']),
      published: !!this.resource.publishedAt,
      productIds: this.resource.products.map((product) => product.id),
      productCount: this.resource.products.length,
    }
  }
}

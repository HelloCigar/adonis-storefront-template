import { BaseTransformer } from '@adonisjs/core/transformers'
import type ProductReview from '#models/catalog/product_review'
import { reviewAuthorName } from '#services/catalog/review_service'

export default class ReviewTransformer extends BaseTransformer<ProductReview> {
  toObject() {
    return {
      ...this.pick(this.resource, [
        'id',
        'rating',
        'title',
        'body',
        'status',
        'createdAt',
        'updatedAt',
      ]),
      // Shoppers see a display name only, never the author email or account ids.
      authorName: reviewAuthorName(this.resource.user),
    }
  }
}

import { BaseTransformer } from '@adonisjs/core/transformers'
import type ProductReview from '#models/catalog/product_review'
import { reviewAuthorName } from '#services/catalog/review_service'

export default class SellerReviewTransformer extends BaseTransformer<ProductReview> {
  toObject() {
    const { product, user } = this.resource
    return {
      ...this.pick(this.resource, [
        'id',
        'rating',
        'title',
        'body',
        'status',
        'orderId',
        'moderatedAt',
        'createdAt',
        'updatedAt',
      ]),
      authorName: reviewAuthorName(user),
      customerEmail: user.email,
      product: { id: product.id, title: product.title, handle: product.handle },
    }
  }
}

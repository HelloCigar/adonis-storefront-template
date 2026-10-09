import { inject } from '@adonisjs/core'
import { BasePolicy } from '@adonisjs/bouncer'
import type User from '#models/account/user'
import type Product from '#models/catalog/product'
import type ProductReview from '#models/catalog/product_review'
import CatalogReviewService from '#services/catalog/review_service'

/**
 * Reviews belong to their author for every role: admins cannot edit or delete another
 * account's review. Eligibility follows the account's own delivered orders.
 */
@inject()
export default class ReviewPolicy extends BasePolicy {
  constructor(private reviews: CatalogReviewService) {
    super()
  }

  async create(user: User, product: Product) {
    return this.reviews.canReview(user, product.id)
  }

  update(user: User, review: ProductReview) {
    return user.id === review.userId
  }

  delete(user: User, review: ProductReview) {
    return user.id === review.userId
  }
}

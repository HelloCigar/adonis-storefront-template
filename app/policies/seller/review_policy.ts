import { BasePolicy } from '@adonisjs/bouncer'
import type User from '#models/account/user'
import type ProductReview from '#models/catalog/product_review'

export default class ReviewPolicy extends BasePolicy {
  viewAny(user: User) {
    return user.isStoreStaff
  }

  /** Staff moderate visibility only; they cannot edit or delete review text. */
  update(user: User, _review: ProductReview) {
    return user.isStoreStaff
  }
}

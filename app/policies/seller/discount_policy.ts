import { BasePolicy } from '@adonisjs/bouncer'
import type User from '#models/account/user'
import type DiscountCode from '#models/checkout/discount_code'

export default class DiscountPolicy extends BasePolicy {
  viewAny(user: User) {
    return user.isStoreStaff
  }

  create(user: User) {
    return user.isStoreStaff
  }

  update(user: User, _discount: DiscountCode) {
    return user.isStoreStaff
  }

  /** A code that has been redeemed stays for order history; deactivate it instead. */
  delete(user: User, discount: DiscountCode) {
    return user.isStoreStaff && discount.timesUsed === 0
  }
}

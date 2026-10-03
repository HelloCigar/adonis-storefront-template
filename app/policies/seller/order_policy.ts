import { BasePolicy } from '@adonisjs/bouncer'
import type User from '#models/account/user'
import type Order from '#models/checkout/order'

export default class OrderPolicy extends BasePolicy {
  viewAny(user: User) {
    return user.isStoreStaff
  }

  view(user: User, _order: Order) {
    return user.isStoreStaff
  }

  update(user: User, order: Order) {
    return this.view(user, order)
  }
}

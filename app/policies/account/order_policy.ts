import { BasePolicy } from '@adonisjs/bouncer'
import type User from '#models/account/user'
import type Order from '#models/checkout/order'

export default class OrderPolicy extends BasePolicy {
  viewAny(user: User, account: User) {
    return user.id === account.id
  }

  view(user: User, order: Order) {
    return user.id === order.userId
  }
}

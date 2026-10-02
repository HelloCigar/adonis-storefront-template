import { BasePolicy } from '@adonisjs/bouncer'
import type User from '#models/account/user'
import type Order from '#models/checkout/order'

export default class OrderPolicy extends BasePolicy {
  before(user: User | null) {
    if (user?.role === 'admin') return true
  }

  viewAny(user: User, account: User) {
    return user.id === account.id
  }

  view(user: User, order: Order) {
    return user.id === order.userId
  }
}

import { BasePolicy } from '@adonisjs/bouncer'
import type User from '#models/account/user'
import type Order from '#models/checkout/order'

export default class OrderPolicy extends BasePolicy {
  before(user: User | null) {
    if (user?.role === 'admin') return true
  }

  viewAny(user: User) {
    return user.role === 'seller'
  }

  async view(user: User, order: Order) {
    if (user.role !== 'seller') return false
    const items = order.$preloaded.lineItems
      ? order.lineItems
      : await order.related('lineItems').query()
    return items.length > 0 && items.every((item) => item.sellerId === user.id)
  }

  update(user: User, order: Order) {
    return this.view(user, order)
  }
}

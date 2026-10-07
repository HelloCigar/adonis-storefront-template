import { BasePolicy } from '@adonisjs/bouncer'
import type User from '#models/account/user'
import type Order from '#models/checkout/order'

/**
 * Order chat runs between the order's account holder and store staff. Guest orders have
 * nobody to answer, and only confirmed orders accept new messages.
 */
export default class OrderPolicy extends BasePolicy {
  viewAny(user: User) {
    return user.isStoreStaff
  }

  view(user: User, order: Order) {
    if (!order.userId) return false
    return order.userId === user.id || user.isStoreStaff
  }

  send(user: User, order: Order) {
    return order.lifecycleState === 'confirmed' && this.view(user, order)
  }
}

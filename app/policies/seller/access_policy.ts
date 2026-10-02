import { BasePolicy } from '@adonisjs/bouncer'
import type User from '#models/account/user'

export default class AccessPolicy extends BasePolicy {
  before(user: User | null) {
    if (user?.role === 'admin') return true
  }

  access(user: User) {
    return user.role === 'seller'
  }
}

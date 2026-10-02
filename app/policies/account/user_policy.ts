import { BasePolicy } from '@adonisjs/bouncer'
import type User from '#models/account/user'

export default class UserPolicy extends BasePolicy {
  before(user: User | null) {
    if (user?.role === 'admin') return true
  }

  view(user: User, account: User) {
    return user.id === account.id
  }

  update(user: User, account: User) {
    return user.id === account.id
  }
}

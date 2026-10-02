import { BasePolicy } from '@adonisjs/bouncer'
import type User from '#models/account/user'
import type { UserRole } from '#models/account/user'

export default class UserPolicy extends BasePolicy {
  before(user: User | null) {
    if (user?.role === 'admin') return true
  }

  viewAny(_user: User) {
    return false
  }

  create(_user: User) {
    return false
  }

  update(_user: User, _target: User) {
    return false
  }

  delete(_user: User, _target: User) {
    return false
  }

  assignRole(_user: User, _role: UserRole) {
    return false
  }
}

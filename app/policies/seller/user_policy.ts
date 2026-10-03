import { BasePolicy } from '@adonisjs/bouncer'
import type User from '#models/account/user'
import type { UserRole } from '#models/account/user'

export default class UserPolicy extends BasePolicy {
  viewAny(user: User) {
    return user.role === 'admin'
  }

  create(user: User) {
    return user.role === 'admin'
  }

  update(user: User, _target: User) {
    return user.role === 'admin'
  }

  delete(user: User, target: User) {
    return user.role === 'admin' && user.id !== target.id
  }

  assignRole(user: User, role: UserRole, target?: User) {
    return user.role === 'admin' && (!target || user.id !== target.id || role === user.role)
  }
}

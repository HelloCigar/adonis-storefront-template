import { BasePolicy } from '@adonisjs/bouncer'
import type User from '#models/account/user'

export default class UserPolicy extends BasePolicy {
  view(user: User, account: User) {
    return user.id === account.id
  }

  update(user: User, account: User) {
    return user.id === account.id
  }
}

import { BasePolicy } from '@adonisjs/bouncer'
import type User from '#models/account/user'

export default class AccessPolicy extends BasePolicy {
  access(user: User) {
    return user.isStoreStaff
  }
}

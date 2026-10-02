import { BasePolicy } from '@adonisjs/bouncer'
import type User from '#models/account/user'
import type CustomerAddress from '#models/account/customer_address'

export default class AddressPolicy extends BasePolicy {
  before(user: User | null) {
    if (user?.role === 'admin') return true
  }

  create(user: User, account: User) {
    return user.id === account.id
  }

  update(user: User, address: CustomerAddress) {
    return user.id === address.userId
  }

  delete(user: User, address: CustomerAddress) {
    return user.id === address.userId
  }

  setDefault(user: User, address: CustomerAddress) {
    return user.id === address.userId
  }
}

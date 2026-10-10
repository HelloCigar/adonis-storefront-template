import { BasePolicy } from '@adonisjs/bouncer'
import type User from '#models/account/user'
import type Product from '#models/catalog/product'

export default class ProductPolicy extends BasePolicy {
  viewAny(user: User) {
    return user.isStoreStaff
  }

  view(user: User, _product: Product) {
    return user.isStoreStaff
  }

  create(user: User) {
    return user.isStoreStaff
  }

  update(user: User, _product: Product) {
    return user.isStoreStaff
  }

  delete(user: User, _product: Product) {
    return user.isStoreStaff
  }
}

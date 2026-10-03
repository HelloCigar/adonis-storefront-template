import { BasePolicy } from '@adonisjs/bouncer'
import type User from '#models/account/user'
import type Product from '#models/catalog/product'

export default class ImagePolicy extends BasePolicy {
  create(user: User, _product: Product) {
    return user.isStoreStaff
  }

  delete(user: User, _product: Product) {
    return user.isStoreStaff
  }
}

import { BasePolicy } from '@adonisjs/bouncer'
import type User from '#models/account/user'
import type Collection from '#models/catalog/collection'
import type Product from '#models/catalog/product'

export default class CollectionPolicy extends BasePolicy {
  viewAny(user: User) {
    return user.isStoreStaff
  }

  create(user: User) {
    return user.isStoreStaff
  }

  update(user: User, _collection: Collection) {
    return user.isStoreStaff
  }

  delete(user: User, _collection: Collection) {
    return user.isStoreStaff
  }

  attachProducts(user: User, collection: Collection, _products: Product[]) {
    return this.update(user, collection)
  }
}

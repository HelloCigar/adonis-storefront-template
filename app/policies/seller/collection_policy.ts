import { BasePolicy } from '@adonisjs/bouncer'
import type User from '#models/account/user'
import type Collection from '#models/catalog/collection'
import type Product from '#models/catalog/product'

export default class CollectionPolicy extends BasePolicy {
  before(user: User | null) {
    if (user?.role === 'admin') return true
  }

  viewAny(user: User) {
    return user.role === 'seller'
  }

  create(user: User) {
    return user.role === 'seller'
  }

  update(user: User, collection: Collection) {
    return user.role === 'seller' && collection.sellerId === user.id
  }

  delete(user: User, collection: Collection) {
    return user.role === 'seller' && collection.sellerId === user.id
  }

  attachProducts(user: User, collection: Collection, products: Product[]) {
    return (
      this.update(user, collection) && products.every((product) => product.sellerId === user.id)
    )
  }
}

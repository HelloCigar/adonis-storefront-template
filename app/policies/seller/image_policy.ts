import { BasePolicy } from '@adonisjs/bouncer'
import type User from '#models/account/user'
import type Product from '#models/catalog/product'

export default class ImagePolicy extends BasePolicy {
  before(user: User | null) {
    if (user?.role === 'admin') return true
  }

  create(user: User, product: Product) {
    return user.role === 'seller' && product.sellerId === user.id
  }

  delete(user: User, product: Product) {
    return user.role === 'seller' && product.sellerId === user.id
  }
}

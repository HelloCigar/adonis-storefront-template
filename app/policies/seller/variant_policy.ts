import { BasePolicy } from '@adonisjs/bouncer'
import type User from '#models/account/user'
import type Product from '#models/catalog/product'
import type ProductVariant from '#models/catalog/product_variant'

export default class VariantPolicy extends BasePolicy {
  before(user: User | null) {
    if (user?.role === 'admin') return true
  }

  viewAny(user: User, product: Product) {
    return user.role === 'seller' && product.sellerId === user.id
  }

  create(user: User, product: Product) {
    return this.viewAny(user, product)
  }

  update(user: User, variant: ProductVariant, product: Product) {
    return this.viewAny(user, product) && variant.productId === product.id
  }

  delete(user: User, variant: ProductVariant, product: Product) {
    return this.update(user, variant, product)
  }
}

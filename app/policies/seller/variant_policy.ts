import { BasePolicy } from '@adonisjs/bouncer'
import type User from '#models/account/user'
import type Product from '#models/catalog/product'
import type ProductVariant from '#models/catalog/product_variant'

export default class VariantPolicy extends BasePolicy {
  viewAny(user: User, _product: Product) {
    return user.isStoreStaff
  }

  create(user: User, product: Product) {
    return this.viewAny(user, product)
  }

  update(user: User, variant: ProductVariant, product: Product) {
    return this.viewAny(user, product) && variant.productId === product.id
  }

  adjustStock(user: User, variant: ProductVariant, product: Product) {
    return this.update(user, variant, product)
  }

  delete(user: User, variant: ProductVariant, product: Product) {
    return this.update(user, variant, product)
  }
}

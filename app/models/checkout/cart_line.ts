import { CartLineSchema } from '#database/schema'
import Cart from '#models/checkout/cart'
import ProductVariant from '#models/catalog/product_variant'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class CartLine extends CartLineSchema {
  @belongsTo(() => Cart, { foreignKey: 'cartId' })
  declare cart: BelongsTo<typeof Cart>

  @belongsTo(() => ProductVariant, { foreignKey: 'productVariantId' })
  declare variant: BelongsTo<typeof ProductVariant>
}

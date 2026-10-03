import { OrderLineItemSchema } from '#database/schema'
import Order from '#models/checkout/order'
import Product from '#models/catalog/product'
import ProductVariant from '#models/catalog/product_variant'
import User from '#models/account/user'
import { Exception } from '@adonisjs/core/exceptions'
import { beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class OrderLineItem extends OrderLineItemSchema {
  @beforeCreate()
  static async snapshotCreator(item: OrderLineItem) {
    let productId = item.productId
    if (item.productVariantId) {
      const variant = await ProductVariant.query({ client: item.$trx })
        .where('id', item.productVariantId)
        .firstOrFail()
      if (productId && productId !== variant.productId) {
        throw new Exception('The order variant must belong to its product', { status: 422 })
      }
      productId = variant.productId
      item.productId = productId
    }
    if (productId) {
      const product = await Product.query({ client: item.$trx })
        .where('id', productId)
        .firstOrFail()
      // Legacy creator attribution is retained for history, never for access checks.
      item.sellerId = product.sellerId
    }
  }

  @belongsTo(() => User, { foreignKey: 'sellerId' })
  declare seller: BelongsTo<typeof User>

  @column({
    prepare: (value) => (value === null ? null : JSON.stringify(value)),
    consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare options: Record<string, string> | null

  @belongsTo(() => Order, { foreignKey: 'orderId' })
  declare order: BelongsTo<typeof Order>

  @belongsTo(() => Product, { foreignKey: 'productId' })
  declare product: BelongsTo<typeof Product>

  @belongsTo(() => ProductVariant, { foreignKey: 'productVariantId' })
  declare variant: BelongsTo<typeof ProductVariant>
}

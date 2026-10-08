import { OrderLineItemSchema } from '#database/schema'
import Order from '#models/checkout/order'
import Product from '#models/catalog/product'
import ProductVariant from '#models/catalog/product_variant'
import User from '#models/account/user'
import { Exception } from '@adonisjs/core/exceptions'
import { beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { toMajor, toMinor } from '#models/shared/money'
import { jsonColumn } from '#models/shared/json_column'

export default class OrderLineItem extends OrderLineItemSchema {
  @beforeCreate()
  static async snapshotCreator(item: OrderLineItem) {
    let productId = item.productId
    if (item.productVariantId) {
      const variant = await ProductVariant.findOrFail(item.productVariantId, { client: item.$trx })
      if (productId && productId !== variant.productId) {
        throw new Exception('The order variant must belong to its product', { status: 422 })
      }
      productId = variant.productId
      item.productId = productId
    }
    if (productId) {
      const product = await Product.findOrFail(productId, { client: item.$trx })
      // Legacy creator attribution is retained for history, never for access checks.
      item.sellerId = product.sellerId
    }
  }

  /** Money is stored only as integer centavos; peso values are derived for display. */
  @column({ consume: toMinor }) declare unitPriceMinor: number
  @column({ consume: toMinor }) declare discountMinor: number
  @column({ consume: toMinor }) declare totalMinor: number
  get unitPriceAmount() {
    return toMajor(this.unitPriceMinor)
  }
  get discountAmount() {
    return toMajor(this.discountMinor)
  }
  get totalAmount() {
    return toMajor(this.totalMinor)
  }

  @belongsTo(() => User, { foreignKey: 'sellerId' })
  declare seller: BelongsTo<typeof User>

  @column(jsonColumn) declare options: Record<string, string> | null

  @belongsTo(() => Order, { foreignKey: 'orderId' })
  declare order: BelongsTo<typeof Order>

  @belongsTo(() => Product, { foreignKey: 'productId' })
  declare product: BelongsTo<typeof Product>

  @belongsTo(() => ProductVariant, { foreignKey: 'productVariantId' })
  declare variant: BelongsTo<typeof ProductVariant>
}

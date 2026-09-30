import { ProductVariantSchema } from '#database/schema'
import CartLine from '#models/cart_line'
import OrderLineItem from '#models/order_line_item'
import Product from '#models/product'
import { AttachmentLinkModel } from '@jrmc/adonis-attachment/lucid'
import { belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class ProductVariant extends ProductVariantSchema {
  @column({
    prepare: (value) => (value === null ? null : JSON.stringify(value)),
    consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare options: Record<string, string> | null

  @belongsTo(() => Product, { foreignKey: 'productId' })
  declare product: BelongsTo<typeof Product>

  @belongsTo(() => AttachmentLinkModel, { foreignKey: 'featuredMediaId' })
  declare featuredMedia: BelongsTo<typeof AttachmentLinkModel>

  @hasMany(() => CartLine, { foreignKey: 'productVariantId' })
  declare cartLines: HasMany<typeof CartLine>

  @hasMany(() => OrderLineItem, { foreignKey: 'productVariantId' })
  declare orderLineItems: HasMany<typeof OrderLineItem>
}

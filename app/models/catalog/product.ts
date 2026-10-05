import { ProductSchema } from '#database/schema'
import Collection from '#models/catalog/collection'
import ProductVariant from '#models/catalog/product_variant'
import User from '#models/account/user'
import type { OptionDefinition } from '#services/catalog/options_service'
import { attachments, type AttachmentCollectionRelation } from '@jrmc/adonis-attachment/lucid'
import { belongsTo, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'

export default class Product extends ProductSchema {
  @column({
    prepare: (value) => JSON.stringify(value ?? []),
    consume: (value) => (typeof value === 'string' ? JSON.parse(value) : (value ?? [])),
  })
  declare optionDefinitions: OptionDefinition[]

  @belongsTo(() => User, { foreignKey: 'sellerId' })
  declare seller: BelongsTo<typeof User>

  @column({
    prepare: (value) => (value === null ? null : JSON.stringify(value)),
    consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare tags: string[] | null

  @attachments({ folder: 'products' })
  declare media: AttachmentCollectionRelation

  @hasMany(() => ProductVariant, { foreignKey: 'productId' })
  declare variants: HasMany<typeof ProductVariant>

  @manyToMany(() => Collection, {
    pivotTable: 'collection_products',
    pivotForeignKey: 'product_id',
    pivotRelatedForeignKey: 'collection_id',
    pivotColumns: ['position'],
    pivotTimestamps: true,
  })
  declare collections: ManyToMany<typeof Collection>
}

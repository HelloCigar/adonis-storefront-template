import { ProductSchema } from '#database/schema'
import Collection from '#models/catalog/collection'
import ProductVariant from '#models/catalog/product_variant'
import ProductReview from '#models/catalog/product_review'
import User from '#models/account/user'
import type { OptionDefinition } from '#services/catalog/options_service'
import { attachments, type AttachmentCollectionRelation } from '@jrmc/adonis-attachment/lucid'
import { belongsTo, column, hasMany, manyToMany, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import { jsonColumn } from '#models/shared/json_column'

export default class Product extends ProductSchema {
  /** Products shoppers can see: active and published. */
  static published = scope((query) => {
    query.where('status', 'active').whereNotNull('published_at')
  })

  @column({
    prepare: (value) => JSON.stringify(value ?? []),
    consume: (value) => (typeof value === 'string' ? JSON.parse(value) : (value ?? [])),
  })
  declare optionDefinitions: OptionDefinition[]

  @belongsTo(() => User, { foreignKey: 'sellerId' })
  declare seller: BelongsTo<typeof User>

  @column(jsonColumn) declare tags: string[] | null

  @attachments({ folder: 'products' })
  declare media: AttachmentCollectionRelation

  @hasMany(() => ProductVariant, { foreignKey: 'productId' })
  declare variants: HasMany<typeof ProductVariant>

  @hasMany(() => ProductReview, { foreignKey: 'productId' })
  declare reviews: HasMany<typeof ProductReview>

  @manyToMany(() => Collection, {
    pivotTable: 'collection_products',
    pivotForeignKey: 'product_id',
    pivotRelatedForeignKey: 'collection_id',
    pivotColumns: ['position'],
    pivotTimestamps: true,
  })
  declare collections: ManyToMany<typeof Collection>
}

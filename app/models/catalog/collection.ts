import { CollectionSchema } from '#database/schema'
import Product from '#models/catalog/product'
import User from '#models/account/user'
import { attachment, type AttachmentRelation } from '@jrmc/adonis-attachment/lucid'
import { belongsTo, manyToMany, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import { compose } from '@adonisjs/core/helpers'
import { withUlidPrimaryKey } from '#models/shared/with_ulid_primary_key'

export default class Collection extends compose(CollectionSchema, withUlidPrimaryKey()) {
  static published = scope((query) => {
    query.whereNotNull('published_at')
  })

  @belongsTo(() => User, { foreignKey: 'sellerId' })
  declare seller: BelongsTo<typeof User>

  @attachment({ folder: 'collections' })
  declare image: AttachmentRelation

  @manyToMany(() => Product, {
    pivotTable: 'collection_products',
    pivotForeignKey: 'collection_id',
    pivotRelatedForeignKey: 'product_id',
    pivotColumns: ['position'],
    pivotTimestamps: true,
  })
  declare products: ManyToMany<typeof Product>
}

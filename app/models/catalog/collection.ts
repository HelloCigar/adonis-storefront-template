import { CollectionSchema } from '#database/schema'
import Product from '#models/catalog/product'
import User from '#models/account/user'
import { attachment, type AttachmentRelation } from '@jrmc/adonis-attachment/lucid'
import { belongsTo, manyToMany, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'

export default class Collection extends CollectionSchema {
  static forSeller = scope((query, seller: User) => {
    if (seller.role !== 'admin') query.where('sellerId', seller.id)
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

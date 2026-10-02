import { CollectionSchema } from '#database/schema'
import Product from '#models/catalog/product'
import { attachment, type AttachmentRelation } from '@jrmc/adonis-attachment/lucid'
import { manyToMany } from '@adonisjs/lucid/orm'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'

export default class Collection extends CollectionSchema {
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

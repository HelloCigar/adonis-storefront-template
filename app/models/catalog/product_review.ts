import { ProductReviewSchema } from '#database/schema'
import { belongsTo, column, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/account/user'
import Product from '#models/catalog/product'
import Order from '#models/checkout/order'

export const reviewStatuses = ['pending', 'approved', 'hidden'] as const
export type ReviewStatus = (typeof reviewStatuses)[number]

export default class ProductReview extends ProductReviewSchema {
  /** Reviews shoppers can see. */
  static approved = scope((query) => {
    query.where('status', 'approved')
  })

  @column() declare status: ReviewStatus

  @belongsTo(() => Product, { foreignKey: 'productId' })
  declare product: BelongsTo<typeof Product>

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Order, { foreignKey: 'orderId' })
  declare order: BelongsTo<typeof Order>

  @belongsTo(() => User, { foreignKey: 'moderatedById' })
  declare moderatedBy: BelongsTo<typeof User>
}

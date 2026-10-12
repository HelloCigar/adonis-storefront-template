import { DiscountRedemptionSchema } from '#database/schema'
import DiscountCode from '#models/checkout/discount_code'
import Order from '#models/checkout/order'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { compose } from '@adonisjs/core/helpers'
import { withUlidPrimaryKey } from '#models/shared/with_ulid_primary_key'

export default class DiscountRedemption extends compose(
  DiscountRedemptionSchema,
  withUlidPrimaryKey()
) {
  @belongsTo(() => DiscountCode, { foreignKey: 'discountCodeId' })
  declare discountCode: BelongsTo<typeof DiscountCode>

  @belongsTo(() => Order, { foreignKey: 'orderId' })
  declare order: BelongsTo<typeof Order>
}

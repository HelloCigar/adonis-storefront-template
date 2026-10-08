import { DiscountRedemptionSchema } from '#database/schema'
import DiscountCode from '#models/checkout/discount_code'
import Order from '#models/checkout/order'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class DiscountRedemption extends DiscountRedemptionSchema {
  @belongsTo(() => DiscountCode, { foreignKey: 'discountCodeId' })
  declare discountCode: BelongsTo<typeof DiscountCode>

  @belongsTo(() => Order, { foreignKey: 'orderId' })
  declare order: BelongsTo<typeof Order>
}

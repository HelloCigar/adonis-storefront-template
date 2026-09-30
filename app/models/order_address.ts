import { OrderAddressSchema } from '#database/schema'
import Order from '#models/order'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class OrderAddress extends OrderAddressSchema {
  @column({ columnName: 'address1' })
  declare address1: string

  @column({ columnName: 'address2' })
  declare address2: string | null

  @belongsTo(() => Order, { foreignKey: 'orderId' })
  declare order: BelongsTo<typeof Order>
}

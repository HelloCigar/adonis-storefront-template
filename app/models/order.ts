import { OrderSchema } from '#database/schema'
import Cart from '#models/cart'
import OrderAddress from '#models/order_address'
import OrderLineItem from '#models/order_line_item'
import User from '#models/user'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class Order extends OrderSchema {
  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Cart, { foreignKey: 'cartId' })
  declare cart: BelongsTo<typeof Cart>

  @hasMany(() => OrderAddress, { foreignKey: 'orderId' })
  declare addresses: HasMany<typeof OrderAddress>

  @hasMany(() => OrderLineItem, { foreignKey: 'orderId' })
  declare lineItems: HasMany<typeof OrderLineItem>
}

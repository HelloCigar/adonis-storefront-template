import { OrderSchema } from '#database/schema'
import Cart from '#models/checkout/cart'
import OrderAddress from '#models/checkout/order_address'
import OrderLineItem from '#models/checkout/order_line_item'
import User from '#models/account/user'
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

import { CartSchema } from '#database/schema'
import CartLine from '#models/cart_line'
import Order from '#models/order'
import User from '#models/user'
import { belongsTo, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'

export default class Cart extends CartSchema {
  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>

  @hasMany(() => CartLine, { foreignKey: 'cartId' })
  declare lines: HasMany<typeof CartLine>

  @hasOne(() => Order, { foreignKey: 'cartId' })
  declare order: HasOne<typeof Order>
}

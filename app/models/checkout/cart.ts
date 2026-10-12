import { CartSchema } from '#database/schema'
import CartLine from '#models/checkout/cart_line'
import Order from '#models/checkout/order'
import User from '#models/account/user'
import { belongsTo, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import { compose } from '@adonisjs/core/helpers'
import { withUlidPrimaryKey } from '#models/shared/with_ulid_primary_key'

export default class Cart extends compose(CartSchema, withUlidPrimaryKey()) {
  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>

  @hasMany(() => CartLine, { foreignKey: 'cartId' })
  declare lines: HasMany<typeof CartLine>

  @hasOne(() => Order, { foreignKey: 'cartId' })
  declare order: HasOne<typeof Order>
}

import { CartSchema } from '#database/schema'
import CartLine from '#models/checkout/cart_line'
import Order from '#models/checkout/order'
import User from '#models/account/user'
import { belongsTo, hasMany, hasOne, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import { compose } from '@adonisjs/core/helpers'
import { DateTime } from 'luxon'
import checkout from '#config/checkout'
import { withUlidPrimaryKey } from '#models/shared/with_ulid_primary_key'
import { sqlDateTime } from '#models/shared/sql_datetime'

export default class Cart extends compose(CartSchema, withUlidPrimaryKey()) {
  /**
   * Signed-in customers' carts that have sat idle long enough for their one reminder: still
   * active, not yet reminded, holding items, and the customer's most recent active cart.
   */
  static awaitingReminder = scope((query: ModelQueryBuilderContract<typeof Cart>) => {
    const now = DateTime.utc()
    query
      .where('carts.status', 'active')
      .whereNotNull('carts.user_id')
      .whereNull('carts.reminder_sent_at')
      .where('carts.updated_at', '<=', sqlDateTime(now.minus(checkout.cartReminderDelayMs)))
      .where('carts.updated_at', '>=', sqlDateTime(now.minus(checkout.cartReminderMaxIdleMs)))
      .where((expiry) =>
        expiry.whereNull('carts.expires_at').orWhere('carts.expires_at', '>', sqlDateTime(now))
      )
      .whereHas('lines', () => {})
      .whereHas('user', (user) => user.whereNull('cart_reminders_opted_out_at'))
      .whereNotExists((newer) =>
        newer
          .from('carts as newer')
          .whereColumn('newer.user_id', 'carts.user_id')
          .where('newer.status', 'active')
          .whereColumn('newer.updated_at', '>', 'carts.updated_at')
          .whereExists((lines) =>
            lines.from('cart_lines').whereColumn('cart_lines.cart_id', 'newer.id')
          )
      )
  })

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>

  @hasMany(() => CartLine, { foreignKey: 'cartId' })
  declare lines: HasMany<typeof CartLine>

  @hasOne(() => Order, { foreignKey: 'cartId' })
  declare order: HasOne<typeof Order>
}

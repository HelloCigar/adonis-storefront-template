import { OrderSchema } from '#database/schema'
import Cart from '#models/checkout/cart'
import OrderAddress from '#models/checkout/order_address'
import OrderLineItem from '#models/checkout/order_line_item'
import User from '#models/account/user'
import { belongsTo, hasMany, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

export default class Order extends OrderSchema {
  static forSeller = scope<
    typeof Order,
    (query: ModelQueryBuilderContract<typeof Order>, seller: User) => void
  >((query, seller) => {
    if (seller.role === 'admin') return
    // Status and payment belong to the whole order, so sellers need to own every item.
    query.whereHas('lineItems', (items) => items.where('sellerId', seller.id))
    query.whereDoesntHave('lineItems', (items) => {
      items.where((unowned) => unowned.whereNull('sellerId').orWhereNot('sellerId', seller.id))
    })
  })

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Cart, { foreignKey: 'cartId' })
  declare cart: BelongsTo<typeof Cart>

  @hasMany(() => OrderAddress, { foreignKey: 'orderId' })
  declare addresses: HasMany<typeof OrderAddress>

  @hasMany(() => OrderLineItem, { foreignKey: 'orderId' })
  declare lineItems: HasMany<typeof OrderLineItem>
}

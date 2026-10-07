import { OrderSchema } from '#database/schema'
import Cart from '#models/checkout/cart'
import OrderAddress from '#models/checkout/order_address'
import OrderLineItem from '#models/checkout/order_line_item'
import User from '#models/account/user'
import Attempt from '#models/payments/attempt'
import RefundOperation from '#models/payments/refund_operation'
import Shipment from '#models/checkout/shipment'
import Activity from '#models/checkout/activity'
import Payment from '#models/payments/payment'
import Notification from '#models/checkout/notification'
import OrderMessage from '#models/chat/order_message'
import { belongsTo, hasMany, column } from '@adonisjs/lucid/orm'
import { toMajor, toMinor } from '#models/shared/money'
import type { OrderState } from '#services/checkout/state_service'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class Order extends OrderSchema {
  @hasMany(() => Attempt) declare attempts: HasMany<typeof Attempt>
  @hasMany(() => RefundOperation) declare refunds: HasMany<typeof RefundOperation>
  @hasMany(() => Shipment) declare shipments: HasMany<typeof Shipment>
  @hasMany(() => Activity) declare activities: HasMany<typeof Activity>
  @hasMany(() => Payment) declare payments: HasMany<typeof Payment>
  @hasMany(() => Notification) declare notifications: HasMany<typeof Notification>
  @hasMany(() => OrderMessage) declare messages: HasMany<typeof OrderMessage>
  @column() declare lifecycleState: OrderState
  @column() declare source: 'legacy' | 'online'
  /** Money is stored only as integer centavos; peso values are derived for display. */
  @column({ consume: toMinor }) declare subtotalMinor: number
  @column({ consume: toMinor }) declare discountMinor: number
  @column({ consume: toMinor }) declare shippingMinor: number
  @column({ consume: toMinor }) declare taxMinor: number
  @column({ consume: toMinor }) declare totalMinor: number
  get subtotalAmount() {
    return toMajor(this.subtotalMinor)
  }
  get discountAmount() {
    return toMajor(this.discountMinor)
  }
  get shippingAmount() {
    return toMajor(this.shippingMinor)
  }
  get taxAmount() {
    return toMajor(this.taxMinor)
  }
  get totalAmount() {
    return toMajor(this.totalMinor)
  }
  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Cart, { foreignKey: 'cartId' })
  declare cart: BelongsTo<typeof Cart>

  @hasMany(() => OrderAddress, { foreignKey: 'orderId' })
  declare addresses: HasMany<typeof OrderAddress>

  @hasMany(() => OrderLineItem, { foreignKey: 'orderId' })
  declare lineItems: HasMany<typeof OrderLineItem>
}

import { PaymentSchema } from '#database/schema'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Order from '#models/checkout/order'

export default class Payment extends PaymentSchema {
  @column({ consume: Boolean }) declare liveMode: boolean
  @column({ consume: Number }) declare amountMinor: number
  @column() declare disposition: 'accepted' | 'overpayment' | 'review_required'
  @belongsTo(() => Order) declare order: BelongsTo<typeof Order>
}

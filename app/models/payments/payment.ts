import { PaymentSchema } from '#database/schema'
import { belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Order from '#models/checkout/order'
import RefundOperation from '#models/payments/refund_operation'

export default class Payment extends PaymentSchema {
  @column() declare disposition: 'accepted' | 'overpayment' | 'review_required'
  @belongsTo(() => Order) declare order: BelongsTo<typeof Order>
  @hasMany(() => RefundOperation) declare refunds: HasMany<typeof RefundOperation>
}

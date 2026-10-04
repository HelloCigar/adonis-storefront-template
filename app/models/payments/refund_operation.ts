import { RefundOperationSchema } from '#database/schema'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Payment from '#models/payments/payment'
import type { RefundState } from '#services/checkout/state_service'

export default class RefundOperation extends RefundOperationSchema {
  @column({ consume: Boolean }) declare liveMode: boolean
  @column({ consume: Boolean }) declare needsReview: boolean
  @column() declare state: RefundState
  @column() declare reason: 'duplicate' | 'fraudulent' | 'requested_by_customer'
  @column({ consume: Number }) declare amountMinor: number
  @column({ consume: (value) => (value === null ? null : Number(value)) })
  declare replayUntilMs: number | null
  @column({ consume: (value) => (value === null ? null : Number(value)) })
  declare claimExpiresAtMs: number | null
  @belongsTo(() => Payment) declare payment: BelongsTo<typeof Payment>
}

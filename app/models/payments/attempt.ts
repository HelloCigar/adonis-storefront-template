import { PaymentAttemptSchema } from '#database/schema'
import { column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Order from '#models/checkout/order'
import { jsonColumn } from '#models/shared/json_column'
import type { CheckoutInput } from '#services/payments/payment_service'
import type { AttemptState } from '#services/checkout/state_service'

export default class Attempt extends PaymentAttemptSchema {
  static table = 'payment_attempts'
  @column({ consume: Boolean }) declare liveMode: boolean
  @column({ consume: Boolean }) declare needsReview: boolean
  @column(jsonColumn) declare requestSnapshot: CheckoutInput
  @column() declare state: AttemptState
  @column({ consume: Number }) declare amountMinor: number
  @column({ consume: Number }) declare expiresAtMs: number
  @column({ consume: (value) => (value === null ? null : Number(value)) })
  declare replayUntilMs: number | null
  @column({ consume: (value) => (value === null ? null : Number(value)) })
  declare claimExpiresAtMs: number | null
  @belongsTo(() => Order) declare order: BelongsTo<typeof Order>
}

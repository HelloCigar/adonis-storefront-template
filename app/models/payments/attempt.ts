import { PaymentAttemptSchema } from '#database/schema'
import { column, belongsTo, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Order from '#models/checkout/order'
import { jsonColumn } from '#models/shared/json_column'
import type { CheckoutInput } from '#services/payments/payment_service'
import type { AttemptState } from '#services/checkout/state_service'
import { compose } from '@adonisjs/core/helpers'
import { withUlidPrimaryKey } from '#models/shared/with_ulid_primary_key'

export default class Attempt extends compose(PaymentAttemptSchema, withUlidPrimaryKey()) {
  static table = 'payment_attempts'

  /** Checkouts that may still take or settle a payment. */
  static openStates = [
    'creating',
    'pending',
    'unknown',
    'closing',
  ] as const satisfies AttemptState[]
  /** Open attempts plus failed ones, which recovery retries or closes. */
  static recoverableStates = [...Attempt.openStates, 'failed'] as const satisfies AttemptState[]

  static open = scope((query) => {
    query.whereIn('state', [...Attempt.openStates])
  })

  static recoverable = scope((query) => {
    query.whereIn('state', [...Attempt.recoverableStates])
  })

  @column(jsonColumn) declare requestSnapshot: CheckoutInput
  @column() declare state: AttemptState
  @belongsTo(() => Order) declare order: BelongsTo<typeof Order>
}

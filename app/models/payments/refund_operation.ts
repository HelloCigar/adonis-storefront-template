import { RefundOperationSchema } from '#database/schema'
import { belongsTo, column, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Payment from '#models/payments/payment'
import type { RefundState } from '#services/checkout/state_service'
import { compose } from '@adonisjs/core/helpers'
import { withUlidPrimaryKey } from '#models/shared/with_ulid_primary_key'

export default class RefundOperation extends compose(RefundOperationSchema, withUlidPrimaryKey()) {
  /** Refunds the provider may still settle; failed and succeeded ones are final. */
  static inFlightStates = ['requested', 'pending', 'unknown'] as const satisfies RefundState[]

  static inFlight = scope((query) => {
    query.whereIn('state', [...RefundOperation.inFlightStates])
  })

  @column() declare state: RefundState
  @column() declare reason: 'duplicate' | 'fraudulent' | 'requested_by_customer'
  @belongsTo(() => Payment) declare payment: BelongsTo<typeof Payment>
}

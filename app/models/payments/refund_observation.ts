import { column } from '@adonisjs/lucid/orm'
import { RefundObservationSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { withUlidPrimaryKey } from '#models/shared/with_ulid_primary_key'

export default class RefundObservation extends compose(
  RefundObservationSchema,
  withUlidPrimaryKey()
) {
  @column() declare state: 'pending' | 'succeeded' | 'failed'
}

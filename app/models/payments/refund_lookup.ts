import { column } from '@adonisjs/lucid/orm'
import { RefundLookupSchema } from '#database/schema'
import { compose } from '@adonisjs/core/helpers'
import { withUlidPrimaryKey } from '#models/shared/with_ulid_primary_key'

export default class RefundLookup extends compose(RefundLookupSchema, withUlidPrimaryKey()) {
  @column() declare state: 'pending' | 'resolved' | 'review_required'
}

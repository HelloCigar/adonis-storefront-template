import { column } from '@adonisjs/lucid/orm'
import { RefundLookupSchema } from '#database/schema'

export default class RefundLookup extends RefundLookupSchema {
  @column() declare state: 'pending' | 'resolved' | 'review_required'
}

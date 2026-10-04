import { column } from '@adonisjs/lucid/orm'
import { RefundLookupSchema } from '#database/schema'

export default class RefundLookup extends RefundLookupSchema {
  @column({ consume: Boolean }) declare liveMode: boolean
  @column() declare state: 'pending' | 'resolved' | 'review_required'
  @column({ consume: (value) => (value === null ? null : Number(value)) })
  declare claimExpiresAtMs: number | null
}

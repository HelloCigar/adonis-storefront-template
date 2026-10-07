import { OrderNotificationSchema } from '#database/schema'
import { column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import WorkflowOutbox from '#models/checkout/workflow_outbox'

export default class Notification extends OrderNotificationSchema {
  static table = 'order_notifications'
  @column() declare kind: 'receipt' | 'shipment'
  @column() declare state: 'pending' | 'sent' | 'failed'

  /** Outbox rows are keyed by kind and entity id; these are the ones that deliver this notification. */
  @hasMany(() => WorkflowOutbox, {
    foreignKey: 'entityId',
    onQuery: (query) => query.where('kind', 'notification'),
  })
  declare outboxEntries: HasMany<typeof WorkflowOutbox>
}

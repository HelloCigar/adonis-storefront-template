import { WorkflowOutboxSchema } from '#database/schema'
import { column } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import { withUlidPrimaryKey } from '#models/shared/with_ulid_primary_key'

export type WorkflowKind =
  | 'create_checkout'
  | 'reconcile_checkout'
  | 'expire_checkout'
  | 'submit_refund'
  | 'reconcile_refund'
  | 'lookup_refund'
  | 'notification'

export default class WorkflowOutbox extends compose(WorkflowOutboxSchema, withUlidPrimaryKey()) {
  static table = 'workflow_outbox'
  @column() declare kind: WorkflowKind
}

import { WorkflowOutboxSchema } from '#database/schema'
import { column } from '@adonisjs/lucid/orm'

export type WorkflowKind =
  | 'create_checkout'
  | 'reconcile_checkout'
  | 'expire_checkout'
  | 'submit_refund'
  | 'reconcile_refund'
  | 'lookup_refund'
  | 'notification'

export default class WorkflowOutbox extends WorkflowOutboxSchema {
  static table = 'workflow_outbox'
  @column() declare kind: WorkflowKind
  @column({ consume: Number }) declare availableAtMs: number
  @column({ consume: (value) => (value === null ? null : Number(value)) })
  declare claimExpiresAtMs: number | null
}

import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import WorkflowOutbox from '#models/checkout/workflow_outbox'
import { affectedRows } from '#models/shared/affected_rows'
import CreateCheckout from '#jobs/payments/create_checkout'
import ReconcileCheckout from '#jobs/payments/reconcile_checkout'
import ExpireCheckout from '#jobs/payments/expire_checkout'
import SubmitRefund from '#jobs/payments/submit_refund'
import ReconcileRefund from '#jobs/payments/reconcile_refund'
import LookupRefund from '#jobs/payments/lookup_refund'
import SendNotification from '#jobs/checkout/send_notification'

const jobs = {
  create_checkout: (payload: { entityId: number }) => CreateCheckout.dispatch(payload),
  reconcile_checkout: (payload: { entityId: number }) => ReconcileCheckout.dispatch(payload),
  expire_checkout: (payload: { entityId: number }) => ExpireCheckout.dispatch(payload),
  submit_refund: (payload: { entityId: number }) => SubmitRefund.dispatch(payload),
  reconcile_refund: (payload: { entityId: number }) => ReconcileRefund.dispatch(payload),
  lookup_refund: (payload: { entityId: number }) => LookupRefund.dispatch(payload),
  notification: (payload: { entityId: number }) => SendNotification.dispatch(payload),
}

/** Queue publication is at least once. Each job's domain operation is idempotent. */
export default class OutboxPublisherService {
  async publish(limit = 100) {
    const rows = await WorkflowOutbox.query()
      .whereNull('published_at')
      .where((q) =>
        q.whereNull('claim_expires_at_ms').orWhere('claim_expires_at_ms', '<', Date.now())
      )
      .where('available_at_ms', '<=', Date.now() + 24 * 60 * 60 * 1000)
      .orderBy('available_at_ms')
      .limit(limit)
    for (const row of rows) {
      const token = randomUUID()
      const changed = await WorkflowOutbox.query()
        .where('id', row.id)
        .whereNull('published_at')
        .where((q) =>
          q.whereNull('claim_expires_at_ms').orWhere('claim_expires_at_ms', '<', Date.now())
        )
        .update({ claimToken: token, claimExpiresAtMs: Date.now() + 60_000 })
      if (affectedRows(changed) !== 1) continue
      try {
        const result = await this.dispatch(row)
        await WorkflowOutbox.query()
          .where('id', row.id)
          .where('claim_token', token)
          .update({
            publishedAt: DateTime.utc().toSQL({ includeOffset: false }),
            jobId: result.jobId,
            claimToken: null,
            claimExpiresAtMs: null,
            lastError: null,
          })
      } catch {
        await WorkflowOutbox.query()
          .where('id', row.id)
          .where('claim_token', token)
          .update({
            publicationAttempts: row.publicationAttempts + 1,
            lastError: 'E_QUEUE_PUBLICATION',
            claimToken: null,
            claimExpiresAtMs:
              Date.now() + Math.min(300_000, 5_000 * 2 ** Math.min(row.publicationAttempts, 6)),
          })
        logger.error({ outboxId: row.id, kind: row.kind }, 'Workflow queue publication failed')
      }
    }
  }

  private async dispatch(row: WorkflowOutbox) {
    const payload = { entityId: row.entityId }
    const dispatch = jobs[row.kind](payload)
    return await dispatch
      .in(Math.max(0, row.availableAtMs - Date.now()))
      .dedup({ id: row.operationKey })
      .run()
  }
}

import { randomUUID } from 'node:crypto'
import { sqlDateTime } from '#models/shared/sql_datetime'
import logger from '@adonisjs/core/services/logger'
import WorkflowOutbox from '#models/checkout/workflow_outbox'
import { affectedRows } from '#models/shared/affected_rows'
import { leaseFor, leaseMs, leaseReleased, unleased } from '#models/shared/lease'
import CreateCheckout from '#jobs/payments/create_checkout'
import ReconcileCheckout from '#jobs/payments/reconcile_checkout'
import ExpireCheckout from '#jobs/payments/expire_checkout'
import SubmitRefund from '#jobs/payments/submit_refund'
import ReconcileRefund from '#jobs/payments/reconcile_refund'
import LookupRefund from '#jobs/payments/lookup_refund'
import SendNotification from '#jobs/checkout/send_notification'

const jobs = {
  create_checkout: (payload: { entityId: string }) => CreateCheckout.dispatch(payload),
  reconcile_checkout: (payload: { entityId: string }) => ReconcileCheckout.dispatch(payload),
  expire_checkout: (payload: { entityId: string }) => ExpireCheckout.dispatch(payload),
  submit_refund: (payload: { entityId: string }) => SubmitRefund.dispatch(payload),
  reconcile_refund: (payload: { entityId: string }) => ReconcileRefund.dispatch(payload),
  lookup_refund: (payload: { entityId: string }) => LookupRefund.dispatch(payload),
  notification: (payload: { entityId: string }) => SendNotification.dispatch(payload),
}

/** Queue publication is at least once. Each job's domain operation is idempotent. */
export default class OutboxPublisherService {
  async publish(limit = 100) {
    const rows = await WorkflowOutbox.query()
      .whereNull('published_at')
      .where(unleased)
      .where('available_at_ms', '<=', Date.now() + 24 * 60 * 60 * 1000)
      .orderBy('available_at_ms')
      .limit(limit)
    for (const row of rows) {
      const token = randomUUID()
      const changed = await WorkflowOutbox.query()
        .where('id', row.id)
        .whereNull('published_at')
        .where(unleased)
        .update(leaseFor(token, leaseMs.publication))
      if (affectedRows(changed) !== 1) continue
      try {
        const result = await this.dispatch(row)
        await WorkflowOutbox.query()
          .where('id', row.id)
          .where('claim_token', token)
          .update({
            publishedAt: sqlDateTime(),
            jobId: result.jobId,
            ...leaseReleased(),
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

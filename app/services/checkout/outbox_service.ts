import WorkflowOutbox, { type WorkflowKind } from '#models/checkout/workflow_outbox'
import CheckoutException from '#exceptions/checkout_exception'
import WorkflowOutboxReady from '#events/checkout/workflow_outbox_ready'
import logger from '@adonisjs/core/services/logger'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

// Share the guard across DI-created service instances without retaining completed transactions.
const publicationTransactions = new WeakSet<TransactionClientContract>()

/** Call within the same transaction as the business change. Publication follows after commit. */
export default class OutboxService {
  async record(
    trx: TransactionClientContract,
    operation: {
      key: string
      kind: WorkflowKind
      entityId: number
      availableAtMs?: number
    }
  ) {
    if (
      !operation.key ||
      operation.key.length > 200 ||
      !Number.isSafeInteger(operation.entityId) ||
      operation.entityId < 1
    ) {
      throw new CheckoutException('Invalid workflow operation', 'E_WORKFLOW_INPUT', 422)
    }
    const row = await WorkflowOutbox.firstOrCreate(
      { operationKey: operation.key },
      {
        kind: operation.kind,
        entityId: operation.entityId,
        availableAtMs: operation.availableAtMs ?? Date.now(),
        publicationAttempts: 0,
      },
      { client: trx }
    )
    if (row.kind !== operation.kind || row.entityId !== operation.entityId) {
      throw new CheckoutException(
        'Workflow key is already used for another operation',
        'E_WORKFLOW_CONFLICT'
      )
    }
    if (!publicationTransactions.has(trx)) {
      publicationTransactions.add(trx)
      trx.after('commit', async () => {
        try {
          await WorkflowOutboxReady.dispatch()
        } catch {
          logger.error('Workflow outbox event dispatch failed; the scheduled relay will retry')
        }
      })
    }
    return row
  }
}

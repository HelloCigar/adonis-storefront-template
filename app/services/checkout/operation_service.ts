import { randomUUID } from 'node:crypto'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import User from '#models/account/user'
import Attempt from '#models/payments/attempt'
import RefundOperation from '#models/payments/refund_operation'
import Notification from '#models/checkout/notification'
import RecoveryService from '#services/payments/recovery_service'
import RefundService from '#services/payments/refund_service'
import OutboxService from '#services/checkout/outbox_service'
import ActivityService from '#services/checkout/activity_service'
import CheckoutException from '#exceptions/checkout_exception'

@inject()
export default class OperationService {
  constructor(
    private recovery: RecoveryService,
    private refunds: RefundService,
    private outbox: OutboxService,
    private activities: ActivityService
  ) {}
  async retry(
    orderId: number,
    actor: User,
    input: { kind: 'payment' | 'refund' | 'notification'; operationId: number; externalId?: string }
  ) {
    if (!actor.isStoreStaff) throw new CheckoutException('Access denied', 'E_OPERATION_ACCESS', 403)
    if (input.kind === 'payment') {
      const attempt = await Attempt.query()
        .where('id', input.operationId)
        .where('order_id', orderId)
        .firstOrFail()
      return this.recovery.retry(attempt.id, actor, input.externalId)
    }
    if (input.kind === 'refund') {
      const refund = await RefundOperation.query()
        .where('id', input.operationId)
        .where('order_id', orderId)
        .firstOrFail()
      return this.refunds.retry(refund.id, actor, input.externalId)
    }
    await db.transaction(async (trx) => {
      const row = await Notification.query({ client: trx })
        .where('id', input.operationId)
        .where('order_id', orderId)
        .firstOrFail()
      if (row.state === 'sent') return
      if (Number(row.claimExpiresAtMs ?? 0) > Date.now())
        throw new CheckoutException('This notification is still running', 'E_NOTIFICATION_BUSY')
      row.state = 'pending'
      row.lastError = null
      await row.save()
      await this.outbox.record(trx, {
        key: `notification-retry:${row.id}:${randomUUID()}`,
        kind: 'notification',
        entityId: row.id,
      })
      await this.activities.record(
        trx,
        orderId,
        'notification.retry_requested',
        { notificationId: row.id },
        actor.id
      )
    })
  }
}

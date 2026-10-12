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
import { isLeased } from '#models/shared/lease'

@inject()
export default class OperationService {
  constructor(
    private recovery: RecoveryService,
    private refunds: RefundService,
    private outbox: OutboxService,
    private activities: ActivityService
  ) {}
  async retry(
    orderId: string,
    actor: User,
    input: { kind: 'payment' | 'refund' | 'notification'; operationId: string; externalId?: string }
  ) {
    CheckoutException.assertStaff(actor, 'E_OPERATION_ACCESS')
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
      if (isLeased(row))
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

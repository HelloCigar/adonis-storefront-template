import { randomUUID } from 'node:crypto'
import { inject } from '@adonisjs/core'
import { urlFor } from '@adonisjs/core/services/url_builder'
import { DateTime } from 'luxon'
import { sqlDateTime } from '#models/shared/sql_datetime'
import mail from '@adonisjs/mail/services/main'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import Notification from '#models/checkout/notification'
import Order from '#models/checkout/order'
import OrderAccessService from '#services/checkout/order_access_service'
import OutboxService from '#services/checkout/outbox_service'
import OrderNotification from '#mails/checkout/order_notification'
import checkout from '#config/checkout'
import { affectedRows } from '#models/shared/affected_rows'
import { leaseFor, leaseMs, leaseReleased, unleased } from '#models/shared/lease'

@inject()
export default class NotificationService {
  constructor(
    private access: OrderAccessService,
    private outbox: OutboxService
  ) {}
  async run(id: number) {
    const token = randomUUID()
    const claimed = await Notification.query()
      .where('id', id)
      .whereNot('state', 'sent')
      .where(unleased)
      .update(leaseFor(token, leaseMs.operation))
    if (affectedRows(claimed) !== 1) return
    try {
      const row = await Notification.findOrFail(id)
      const order = await Order.query()
        .where('id', row.orderId)
        .preload('lineItems', (items) => items.orderBy('id'))
        .preload('addresses')
        .firstOrFail()
      const shipment = await order.related('shipments').query().first()
      const grant = await this.access.issue(order.id)
      const url = urlFor(
        'checkout.access.show',
        { publicId: order.publicId! },
        { prefixUrl: new URL(checkout.publicUrl ?? '').origin, qs: { token: grant } }
      )
      // This service runs inside the durable notification job. Await delivery before acknowledging it.
      await mail.send(new OrderNotification(order, row.kind, url, shipment, row.id))
      await Notification.query()
        .where('id', id)
        .where('claim_token', token)
        .update({
          state: 'sent',
          sentAt: sqlDateTime(),
          ...leaseReleased(),
          lastError: null,
        })
    } catch {
      await Notification.query()
        .where('id', id)
        .where('claim_token', token)
        .update({
          state: 'failed',
          ...leaseReleased(),
          lastError: 'E_NOTIFICATION_DELIVERY',
        })
      throw new Error('Order notification delivery failed')
    }
  }
  async failed(id: number) {
    await Notification.query()
      .where('id', id)
      .whereNot('state', 'sent')
      .update({
        state: 'failed',
        lastError: 'E_NOTIFICATION_RETRIES_EXHAUSTED',
        ...leaseReleased(),
      })
    logger.error({ notificationId: id }, 'Order notification retries exhausted')
  }

  /**
   * Re-queues pending notifications whose job was lost, e.g. a stalled job the queue dropped.
   * Failed notifications stay with staff. Skips rows with outbox work still waiting or recent.
   */
  async sweep() {
    const staleAt = sqlDateTime(DateTime.utc().minus({ minutes: 2 }))
    const rows = await Notification.query()
      .where('state', 'pending')
      .where(unleased)
      .where('updated_at', '<', staleAt)
      .whereDoesntHave('outboxEntries', (entries) =>
        entries.where((recent) =>
          recent.whereNull('published_at').orWhere('created_at', '>=', staleAt)
        )
      )
      .orderBy('id')
      .limit(100)
    for (const row of rows)
      await db.transaction((trx) =>
        this.outbox.record(trx, {
          key: `notification-sweep:${row.id}:${Math.floor(Date.now() / 60_000)}`,
          kind: 'notification',
          entityId: row.id,
        })
      )
  }
}

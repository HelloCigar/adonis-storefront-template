import { randomUUID } from 'node:crypto'
import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import mail from '@adonisjs/mail/services/main'
import logger from '@adonisjs/core/services/logger'
import Notification from '#models/checkout/notification'
import Order from '#models/checkout/order'
import Shipment from '#models/checkout/shipment'
import OrderAccessService from '#services/checkout/order_access_service'
import OrderNotification from '#mails/checkout/order_notification'
import checkout from '#config/checkout'
import { affectedRows } from '#models/shared/affected_rows'

@inject()
export default class NotificationService {
  constructor(private access: OrderAccessService) {}
  async run(id: number) {
    const token = randomUUID()
    const claimed = await Notification.query()
      .where('id', id)
      .whereNot('state', 'sent')
      .where((q) =>
        q.whereNull('claim_expires_at_ms').orWhere('claim_expires_at_ms', '<', Date.now())
      )
      .update({ claimToken: token, claimExpiresAtMs: Date.now() + 120_000 })
    if (affectedRows(claimed) !== 1) return
    try {
      const row = await Notification.findOrFail(id)
      const order = await Order.findOrFail(row.orderId)
      const shipment = await Shipment.query().where('order_id', order.id).first()
      const grant = await this.access.issue(order.id)
      const url = new URL(`/checkout/orders/${order.publicId}/access`, checkout.publicUrl)
      url.searchParams.set('token', grant)
      // This service runs inside the durable notification job. Await delivery before acknowledging it.
      await mail.send(new OrderNotification(order, row.kind, url.toString(), shipment, row.id))
      await Notification.query()
        .where('id', id)
        .where('claim_token', token)
        .update({
          state: 'sent',
          sentAt: DateTime.utc().toSQL({ includeOffset: false }),
          claimToken: null,
          claimExpiresAtMs: null,
          lastError: null,
        })
    } catch {
      await Notification.query().where('id', id).where('claim_token', token).update({
        state: 'failed',
        claimToken: null,
        claimExpiresAtMs: null,
        lastError: 'E_NOTIFICATION_DELIVERY',
      })
      throw new Error('Order notification delivery failed')
    }
  }
  async failed(id: number) {
    await Notification.query().where('id', id).whereNot('state', 'sent').update({
      state: 'failed',
      lastError: 'E_NOTIFICATION_RETRIES_EXHAUSTED',
      claimToken: null,
      claimExpiresAtMs: null,
    })
    logger.error({ notificationId: id }, 'Order notification retries exhausted')
  }
}

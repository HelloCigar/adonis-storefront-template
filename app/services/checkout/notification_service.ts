import { randomUUID } from 'node:crypto'
import { inject } from '@adonisjs/core'
import { urlFor } from '@adonisjs/core/services/url_builder'
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
import { leaseFor, leaseMs, leaseReleased, unleased } from '#models/shared/lease'

@inject()
export default class NotificationService {
  constructor(private access: OrderAccessService) {}
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
      const order = await Order.findOrFail(row.orderId)
      const shipment = await Shipment.query().where('order_id', order.id).first()
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
          sentAt: DateTime.utc().toSQL({ includeOffset: false }),
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
}

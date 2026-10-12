import { inject } from '@adonisjs/core'
import Notification from '#models/checkout/notification'
import OutboxService from '#services/checkout/outbox_service'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

@inject()
export default class NotificationIntentService {
  constructor(private outbox: OutboxService) {}
  async record(trx: TransactionClientContract, orderId: string, kind: Notification['kind']) {
    const notification = await Notification.firstOrCreate(
      { orderId, kind },
      { state: 'pending' },
      { client: trx }
    )
    await this.outbox.record(trx, {
      key: `notification:${notification.id}`,
      kind: 'notification',
      entityId: notification.id,
    })
    return notification
  }
}

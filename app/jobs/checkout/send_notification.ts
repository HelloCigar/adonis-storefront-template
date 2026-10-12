import { Job, exponentialBackoff } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import { inject } from '@adonisjs/core'
import NotificationService from '#services/checkout/notification_service'

@inject()
export default class SendNotification extends Job<{ entityId: string }> {
  static options: JobOptions = {
    queue: 'notifications',
    timeout: '60s',
    retry: { maxRetries: 5, backoff: exponentialBackoff({ baseDelay: '10s', maxDelay: '5m' }) },
    removeOnFail: { age: '30d', count: 1000 },
  }
  constructor(private notifications: NotificationService) {
    super()
  }
  async execute() {
    await this.notifications.run(this.payload.entityId)
  }
  async failed() {
    await this.notifications.failed(this.payload.entityId)
  }
}

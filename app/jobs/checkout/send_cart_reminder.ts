import { Job, exponentialBackoff } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import { inject } from '@adonisjs/core'
import CartReminderService from '#services/checkout/cart_reminder_service'

@inject()
export default class SendCartReminder extends Job<{ cartId: string }> {
  static options: JobOptions = {
    queue: 'notifications',
    timeout: '60s',
    retry: { maxRetries: 5, backoff: exponentialBackoff({ baseDelay: '10s', maxDelay: '5m' }) },
    removeOnFail: { age: '30d', count: 1000 },
  }
  constructor(private reminders: CartReminderService) {
    super()
  }
  async execute() {
    await this.reminders.remind(this.payload.cartId)
  }
}

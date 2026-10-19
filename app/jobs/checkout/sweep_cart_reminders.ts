import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import { inject } from '@adonisjs/core'
import CartReminderService from '#services/checkout/cart_reminder_service'
import SendCartReminder from '#jobs/checkout/send_cart_reminder'

/** Claims idle carts and queues one reminder for each. */
@inject()
export default class SweepCartReminders extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'maintenance',
    timeout: '45s',
    maxRetries: 2,
    removeOnFail: { age: '30d', count: 1000 },
  }
  constructor(private reminders: CartReminderService) {
    super()
  }
  async execute() {
    for (const cartId of await this.reminders.claimDue()) {
      await SendCartReminder.dispatch({ cartId })
    }
  }
}

import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import OutboxPublisherService from '#services/checkout/outbox_publisher_service'

export default class CheckoutPublish extends BaseCommand {
  static commandName = 'checkout:publish'
  static description = 'Publish one bounded batch of committed checkout outbox work'
  static options: CommandOptions = { startApp: true }
  async run() {
    const publisher = await this.app.container.make(OutboxPublisherService)
    await publisher.publish(100)
    this.logger.success(
      'Outbox publication pass complete; run checkout:audit to check pending work'
    )
  }
}

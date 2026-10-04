import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import OutboxPublisherService from '#services/checkout/outbox_publisher_service'
import { inject } from '@adonisjs/core'

export default class CheckoutPublish extends BaseCommand {
  static commandName = 'checkout:publish'
  static description = 'Publish one bounded batch of committed checkout outbox work'
  static options: CommandOptions = { startApp: true }

  @inject()
  async run(publisher: OutboxPublisherService) {
    await publisher.publish(100)
    this.logger.success(
      'Outbox publication pass complete; run checkout:audit to check pending work'
    )
  }
}

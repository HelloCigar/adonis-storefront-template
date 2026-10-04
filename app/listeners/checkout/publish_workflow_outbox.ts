import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import OutboxPublisherService from '#services/checkout/outbox_publisher_service'

@inject()
export default class PublishWorkflowOutbox {
  constructor(private publisher: OutboxPublisherService) {}

  async handle() {
    try {
      await this.publisher.publish(10)
    } catch {
      logger.error('Workflow outbox publication failed; the scheduled relay will retry')
    }
  }
}

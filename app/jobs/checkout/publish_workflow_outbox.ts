import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import { inject } from '@adonisjs/core'
import OutboxPublisherService from '#services/checkout/outbox_publisher_service'

@inject()
export default class PublishWorkflowOutbox extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'maintenance',
    timeout: '45s',
    maxRetries: 2,
    removeOnFail: { age: '30d', count: 1000 },
  }
  constructor(private publisher: OutboxPublisherService) {
    super()
  }
  async execute() {
    await this.publisher.publish()
  }
}

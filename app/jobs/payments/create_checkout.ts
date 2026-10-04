import { Job, exponentialBackoff } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import { inject } from '@adonisjs/core'
import RecoveryService from '#services/payments/recovery_service'

@inject()
export default class CreateCheckout extends Job<{ entityId: number }> {
  static options: JobOptions = {
    queue: 'payments',
    timeout: '90s',
    retry: { maxRetries: 5, backoff: exponentialBackoff({ baseDelay: '5s', maxDelay: '2m' }) },
    removeOnFail: { age: '30d', count: 1000 },
  }
  constructor(protected recovery: RecoveryService) {
    super()
  }
  async execute() {
    await this.recovery.run(this.payload.entityId)
  }
  async failed() {
    await this.recovery.review(this.payload.entityId)
  }
}

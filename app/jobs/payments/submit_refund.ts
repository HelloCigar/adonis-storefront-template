import { Job, exponentialBackoff } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import { inject } from '@adonisjs/core'
import RefundService from '#services/payments/refund_service'

@inject()
export default class SubmitRefund extends Job<{ entityId: string }> {
  static options: JobOptions = {
    queue: 'payments',
    timeout: '90s',
    retry: { maxRetries: 5, backoff: exponentialBackoff({ baseDelay: '5s', maxDelay: '2m' }) },
    removeOnFail: { age: '30d', count: 1000 },
  }
  constructor(protected refunds: RefundService) {
    super()
  }
  async execute() {
    await this.refunds.run(this.payload.entityId)
  }
  async failed() {
    await this.refunds.review(this.payload.entityId)
  }
}

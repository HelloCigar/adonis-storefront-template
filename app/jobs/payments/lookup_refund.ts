import { inject } from '@adonisjs/core'
import { Job, exponentialBackoff } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import RefundLookupService from '#services/payments/refund_lookup_service'

@inject()
export default class LookupRefund extends Job<{ entityId: string }> {
  static options: JobOptions = {
    queue: 'payments',
    timeout: '90s',
    retry: { maxRetries: 5, backoff: exponentialBackoff({ baseDelay: '5s', maxDelay: '2m' }) },
    removeOnFail: { age: '30d', count: 1000 },
  }
  constructor(private lookups: RefundLookupService) {
    super()
  }
  async execute() {
    await this.lookups.run(this.payload.entityId)
  }
  async failed() {
    await this.lookups.review(this.payload.entityId)
  }
}

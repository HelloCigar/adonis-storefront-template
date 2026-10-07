import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import { inject } from '@adonisjs/core'
import RecoveryService from '#services/payments/recovery_service'
import RefundService from '#services/payments/refund_service'
import RefundLookupService from '#services/payments/refund_lookup_service'
import NotificationService from '#services/checkout/notification_service'

@inject()
export default class SweepPaymentOperations extends Job<Record<string, never>> {
  static options: JobOptions = {
    queue: 'maintenance',
    timeout: '45s',
    maxRetries: 2,
    removeOnFail: { age: '30d', count: 1000 },
  }
  constructor(
    private recovery: RecoveryService,
    private refunds: RefundService,
    private lookups: RefundLookupService,
    private notifications: NotificationService
  ) {
    super()
  }
  async execute() {
    await this.recovery.sweep()
    await this.refunds.sweep()
    await this.lookups.sweep()
    await this.notifications.sweep()
  }
}

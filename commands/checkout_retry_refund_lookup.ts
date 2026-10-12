import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import RefundLookupService from '#services/payments/refund_lookup_service'
import { inject } from '@adonisjs/core'
import { isUlid } from '#models/shared/with_ulid_primary_key'

export default class CheckoutRetryRefundLookup extends BaseCommand {
  static commandName = 'checkout:retry-refund-lookup'
  static description = 'Request recovery of a saved refund webhook lookup by its local ID'
  static options: CommandOptions = { startApp: true }
  @args.string({ description: 'Local lookup ID reported by checkout:audit' })
  declare lookupId: string

  @inject()
  async run(lookups: RefundLookupService) {
    const id = this.lookupId.trim().toUpperCase()
    if (!isUlid(id)) {
      this.logger.error('Provide a lookup ID (a 26-character ULID)')
      this.exitCode = 1
      return
    }
    await lookups.retry(id)
    this.logger.success('Refund lookup recovery saved to the outbox')
  }
}

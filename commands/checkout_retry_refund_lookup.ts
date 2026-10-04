import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import RefundLookupService from '#services/payments/refund_lookup_service'

export default class CheckoutRetryRefundLookup extends BaseCommand {
  static commandName = 'checkout:retry-refund-lookup'
  static description = 'Request recovery of a saved refund webhook lookup by its local ID'
  static options: CommandOptions = { startApp: true }
  @args.string({ description: 'Local lookup ID reported by checkout:audit' })
  declare lookupId: string
  async run() {
    const id = Number(this.lookupId)
    if (!Number.isSafeInteger(id) || id <= 0) {
      this.logger.error('Provide a positive lookup ID')
      this.exitCode = 1
      return
    }
    const lookups = await this.app.container.make(RefundLookupService)
    await lookups.retry(id)
    this.logger.success('Refund lookup recovery saved to the outbox')
  }
}

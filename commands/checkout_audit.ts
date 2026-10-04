import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import AuditService from '#services/checkout/audit_service'

export default class CheckoutAudit extends BaseCommand {
  static commandName = 'checkout:audit'
  static description = 'Read checkout, inventory and queue health without changing records'
  static options: CommandOptions = { startApp: true }
  async run() {
    const audit = await this.app.container.make(AuditService)
    const report = await audit.read()
    for (const [kind, ids] of Object.entries(report.issues)) {
      this.logger.info(
        `${kind}: ${ids.length}${ids.length ? ` (local IDs: ${ids.slice(0, 20).join(', ')})` : ''}`
      )
    }
    this.logger.info(`Oldest unpublished outbox: ${report.unpublishedOutboxOldestAt ?? 'none'}`)
    this.logger.info(`Queue: ${JSON.stringify(report.queue)}`)
    this.logger.info(`Schedules: ${JSON.stringify(report.schedules)}`)
    if (
      Object.values(report.issues).some((ids) => ids.length) ||
      report.queue.some((row) => row.status === 'failed')
    )
      this.exitCode = 1
  }
}

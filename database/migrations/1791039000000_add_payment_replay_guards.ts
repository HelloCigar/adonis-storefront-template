import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    for (const name of ['payment_attempts', 'refund_operations']) {
      this.schema.alterTable(name, (table) => {
        table.string('replay_scope', 128).nullable()
        table.bigInteger('replay_until_ms').nullable()
      })
    }
    this.schema.alterTable('order_notifications', (table) => {
      table.string('claim_token', 64).nullable()
      table.bigInteger('claim_expires_at_ms').nullable()
    })
  }
  async down() {
    for (const name of ['payment_attempts', 'refund_operations']) {
      this.schema.alterTable(name, (table) => table.dropColumns('replay_scope', 'replay_until_ms'))
    }
    this.schema.alterTable('order_notifications', (table) =>
      table.dropColumns('claim_token', 'claim_expires_at_ms')
    )
  }
}

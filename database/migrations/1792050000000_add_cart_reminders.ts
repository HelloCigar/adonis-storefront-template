import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('carts', (table) => {
      // Set once when an idle cart is claimed for its single reminder.
      table.timestamp('reminder_sent_at').nullable()
      table.index(['status', 'reminder_sent_at', 'updated_at'])
    })

    this.schema.alterTable('users', (table) => {
      // Null means the customer gets cart reminders, so existing customers need no backfill.
      table.timestamp('cart_reminders_opted_out_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable('users', (table) => {
      table.dropColumn('cart_reminders_opted_out_at')
    })

    this.schema.alterTable('carts', (table) => {
      table.dropIndex(['status', 'reminder_sent_at', 'updated_at'])
      table.dropColumn('reminder_sent_at')
    })
  }
}

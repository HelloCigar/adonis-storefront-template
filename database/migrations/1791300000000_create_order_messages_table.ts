import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * One chat thread per confirmed order, between its account holder and store staff.
 * `public_id` identifies a message to clients, so a broadcast copy and a reloaded copy
 * match; the integer id keeps send order when several messages share a timestamp.
 */
export default class extends BaseSchema {
  protected tableName = 'order_messages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 26).notNullable().primary()
      table.string('public_id', 36).notNullable().unique()
      table
        .string('order_id', 26)
        .notNullable()
        .references('id')
        .inTable('orders')
        .onDelete('CASCADE')
      table
        .string('sender_id', 26)
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      // The side is fixed when sent, so later role changes never move old messages.
      table.enum('sender_role', ['customer', 'staff']).notNullable()
      table.string('sender_name').notNullable()
      table.text('body').notNullable()
      table.timestamp('read_at').nullable()
      table.timestamp('created_at').notNullable()
      table.index(['order_id', 'created_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

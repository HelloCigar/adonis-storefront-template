import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * One chat thread per confirmed order, between its account holder and store staff.
 * `public_id` comes from the realtime engine so a broadcast message and its stored row
 * match; the integer id keeps send order when several messages share a timestamp.
 */
export default class extends BaseSchema {
  protected tableName = 'order_messages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('public_id', 36).notNullable().unique()
      table
        .integer('order_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('orders')
        .onDelete('CASCADE')
      table
        .integer('sender_id')
        .unsigned()
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

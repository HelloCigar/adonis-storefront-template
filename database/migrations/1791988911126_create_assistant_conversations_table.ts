import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * A shopper's exchange with the shopping assistant. A null `user_id` is a signed-out visitor's
 * conversation, reachable only through the session holding its id; signing in claims it.
 */
export default class extends BaseSchema {
  protected tableName = 'assistant_conversations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 26).notNullable().primary()
      table.string('user_id', 26).nullable().references('id').inTable('users').onDelete('CASCADE')
      // The first shopper message, trimmed; labels the conversation in the shopper's history.
      table.string('title', 80).nullable()
      table.timestamp('last_message_at').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.index(['user_id', 'last_message_at'], 'assistant_conversations_user_recent')
      table.index(['last_message_at'], 'assistant_conversations_retention')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

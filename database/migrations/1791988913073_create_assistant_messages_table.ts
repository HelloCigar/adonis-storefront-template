import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * One message in an assistant conversation. The monotonic ULID id keeps send order and doubles
 * as the AI SDK UI message id; `parts` holds the UI message parts as JSON.
 */
export default class extends BaseSchema {
  protected tableName = 'assistant_messages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 26).notNullable().primary()
      table
        .string('conversation_id', 26)
        .notNullable()
        .references('id')
        .inTable('assistant_conversations')
        .onDelete('CASCADE')
      table.enum('role', ['user', 'assistant']).notNullable()
      table.text('parts').notNullable()
      table.timestamp('created_at').notNullable()
      table.index(['conversation_id', 'id'], 'assistant_messages_conversation_order')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

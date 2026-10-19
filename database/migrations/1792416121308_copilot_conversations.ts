import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Both assistants' conversations share this table, told apart by `assistant`. A deleted staff
 * member's copilot conversations stay for review, so the user link now nulls instead of
 * cascading; `participant_name` keeps who it was with readable. SQLite rebuilds the table to
 * change the foreign key, so this migration stays on its own.
 */
export default class extends BaseSchema {
  protected tableName = 'assistant_conversations'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Existing rows are all the shopping assistant's.
      table.enum('assistant', ['shopping', 'copilot']).notNullable().defaultTo('shopping')
      // Snapshot of the person's name when the conversation started; null on shopping = Guest.
      table.string('participant_name', 120).nullable()
      // Stamped whenever the assistant says it couldn't answer.
      table.timestamp('last_unanswered_at').nullable()
      table.index(['assistant', 'last_message_at'], 'assistant_conversations_review')
      table.dropForeign(['user_id'])
      table.foreign('user_id').references('id').inTable('users').onDelete('SET NULL')
    })

    this.defer(async (db) => {
      await db
        .from(this.tableName)
        .whereNotNull('user_id')
        .update({
          participant_name: db.raw(
            '(select full_name from users where users.id = assistant_conversations.user_id)'
          ),
        })
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['user_id'])
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE')
      table.dropIndex(['assistant', 'last_message_at'], 'assistant_conversations_review')
      table.dropColumn('last_unanswered_at')
      table.dropColumn('participant_name')
      table.dropColumn('assistant')
    })
  }
}

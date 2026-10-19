import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * A change the dashboard copilot proposed. Its outcome is derived from the timestamps: at most
 * one of `applied_at`, `dismissed_at` and `refused_at` is ever set; none set and past
 * `expires_at` is expired.
 */
export default class extends BaseSchema {
  protected tableName = 'copilot_proposals'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 26).notNullable().primary()
      table
        .string('conversation_id', 26)
        .notNullable()
        .references('id')
        .inTable('assistant_conversations')
        .onDelete('CASCADE')
      table
        .enum('action', [
          'product_update',
          'variant_update',
          'stock_adjust',
          'collection_create',
          'collection_update',
          'order_pack',
          'order_ship',
          'order_deliver',
          'order_note',
          'discount_create',
          'discount_update',
          'review_moderate',
          'post_create',
          'post_update',
        ])
        .notNullable()
      table.string('summary', 200).notNullable()
      table.boolean('emails_customer').notNullable().defaultTo(false)
      table.timestamp('expires_at').notNullable()
      table.timestamp('applied_at').nullable()
      table.timestamp('dismissed_at').nullable()
      table.timestamp('refused_at').nullable()
      // The message the person saw when Apply was refused.
      table.string('refusal', 300).nullable()
      table.timestamp('created_at').notNullable()
      table.index(['conversation_id'], 'copilot_proposals_conversation')
      table.index(['conversation_id', 'applied_at'], 'copilot_proposals_applied')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

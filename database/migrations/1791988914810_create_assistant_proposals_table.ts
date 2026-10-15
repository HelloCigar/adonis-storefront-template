import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * An add-to-cart the shopping assistant offered. The price snapshot and expiry decide whether it
 * can still be added; only one of `added_at` and `dismissed_at` is ever set.
 */
export default class extends BaseSchema {
  protected tableName = 'assistant_proposals'

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
        .string('product_variant_id', 26)
        .notNullable()
        .references('id')
        .inTable('product_variants')
        .onDelete('CASCADE')
      table.integer('quantity').notNullable()
      // The variant's price_amount when proposed (pesos); a different current price expires it.
      table.decimal('unit_price_amount', 20, 4).notNullable()
      table.string('currency_code', 3).notNullable()
      table.timestamp('expires_at').notNullable()
      table.timestamp('added_at').nullable()
      table.timestamp('dismissed_at').nullable()
      table.timestamp('created_at').notNullable()
      table.index(['conversation_id'], 'assistant_proposals_conversation')
      table.check('quantity >= 1 AND quantity <= 10', [], 'assistant_proposals_quantity_range')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

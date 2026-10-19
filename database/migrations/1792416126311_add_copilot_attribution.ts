import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Timeline and stock-history entries made by applying a copilot proposal. The mark is
 * permanent; the link to the proposal nulls once retention removes its conversation.
 */
export default class extends BaseSchema {
  async up() {
    for (const tableName of ['order_activities', 'stock_adjustments']) {
      this.schema.alterTable(tableName, (table) => {
        table.boolean('via_copilot').notNullable().defaultTo(false)
        table
          .string('copilot_proposal_id', 26)
          .nullable()
          .references('id')
          .inTable('copilot_proposals')
          .onDelete('SET NULL')
      })
    }
  }

  async down() {
    for (const tableName of ['order_activities', 'stock_adjustments']) {
      this.schema.alterTable(tableName, (table) => {
        table.dropForeign(['copilot_proposal_id'])
        table.dropColumn('copilot_proposal_id')
        table.dropColumn('via_copilot')
      })
    }
  }
}

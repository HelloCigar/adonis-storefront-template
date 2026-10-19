import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * One record a copilot proposal changes. `before` and `after` hold raw values of only the
 * changed fields; `before` is null (and `record_id` null) for a create.
 */
export default class extends BaseSchema {
  protected tableName = 'copilot_proposal_items'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 26).notNullable().primary()
      table
        .string('proposal_id', 26)
        .notNullable()
        .references('id')
        .inTable('copilot_proposals')
        .onDelete('CASCADE')
      table.smallint('position').notNullable()
      table
        .enum('record_type', [
          'product',
          'variant',
          'collection',
          'order',
          'discount',
          'review',
          'post',
        ])
        .notNullable()
      table.string('record_id', 26).nullable()
      table.string('record_label', 200).notNullable()
      table.json('before').nullable()
      table.json('after').notNullable()
      table.unique(['proposal_id', 'position'], { indexName: 'copilot_proposal_items_order' })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

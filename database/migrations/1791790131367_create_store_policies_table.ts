import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'store_policies'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 26).notNullable().primary()
      table
        .string('handle', 40)
        .notNullable()
        .unique()
        .checkIn(
          ['refund-policy', 'shipping-policy', 'privacy-policy', 'terms-of-service'],
          'store_policies_handle_allowed'
        )
      // The editor's rich-text document; an empty document leaves content_html empty.
      table.text('content').notNullable()
      table.text('content_html').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

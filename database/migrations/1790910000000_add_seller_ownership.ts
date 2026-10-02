import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Existing records stay unassigned rather than guessing their seller.
    for (const tableName of ['products', 'collections', 'order_line_items']) {
      this.schema.alterTable(tableName, (table) => {
        table.integer('seller_id').unsigned().nullable().references('users.id').onDelete('SET NULL')
        table.index('seller_id')
      })
    }
  }

  async down() {
    for (const tableName of ['order_line_items', 'collections', 'products']) {
      this.schema.alterTable(tableName, (table) => table.dropColumn('seller_id'))
    }
  }
}

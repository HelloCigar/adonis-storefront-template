import { BaseSchema } from '@adonisjs/lucid/schema'

/** Ledger of staff stock changes. Order reservations and sales stay in stock_reservations. */
export default class extends BaseSchema {
  protected tableName = 'stock_adjustments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('product_variant_id')
        .notNullable()
        .references('product_variants.id')
        .onDelete('CASCADE')
      table.integer('actor_id').nullable().references('users.id').onDelete('SET NULL')
      table.string('reason', 24).notNullable()
      // Null means stock was untracked on that side of the change.
      table.integer('quantity_before').nullable()
      table.integer('quantity_after').nullable()
      table.string('note', 500).nullable()
      table.timestamps(true, true)
      table.index(['product_variant_id', 'id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

import { BaseSchema } from '@adonisjs/lucid/schema'

/** Ledger of staff stock changes. Order reservations and sales stay in stock_reservations. */
export default class extends BaseSchema {
  protected tableName = 'stock_adjustments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 26).notNullable().primary()
      table
        .string('product_variant_id', 26)
        .notNullable()
        .references('product_variants.id')
        .onDelete('CASCADE')
      table.string('actor_id', 26).nullable().references('users.id').onDelete('SET NULL')
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

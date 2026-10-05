import { BaseSchema } from '@adonisjs/lucid/schema'

const orderColumns = ['subtotal', 'discount', 'shipping', 'tax', 'total'] as const
const lineItemColumns = ['unit_price', 'discount', 'total'] as const

/**
 * Orders and line items keep money only as integer centavos. Earlier rows stored decimal
 * pesos beside (or instead of) centavos; this backfills centavos and drops the decimals.
 * Columns are dropped with native ALTER TABLE so SQLite never rebuilds the referenced tables.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('orders', (table) => {
      table.bigInteger('discount_minor').notNullable().defaultTo(0)
      table.bigInteger('tax_minor').notNullable().defaultTo(0)
    })
    this.schema.alterTable('order_line_items', (table) => {
      table.bigInteger('discount_minor').notNullable().defaultTo(0)
    })
    this.defer(async (db) => {
      for (const name of orderColumns)
        await db.rawQuery(
          `UPDATE orders SET ${name}_minor = CAST(ROUND(${name}_amount * 100) AS INTEGER) WHERE ${name}_minor IS NULL OR ${name}_minor = 0`
        )
      for (const name of lineItemColumns)
        await db.rawQuery(
          `UPDATE order_line_items SET ${name}_minor = CAST(ROUND(${name}_amount * 100) AS INTEGER) WHERE ${name}_minor IS NULL OR ${name}_minor = 0`
        )
      for (const name of orderColumns)
        await db.rawQuery(`ALTER TABLE orders DROP COLUMN ${name}_amount`)
      for (const name of lineItemColumns)
        await db.rawQuery(`ALTER TABLE order_line_items DROP COLUMN ${name}_amount`)
    })
  }

  async down() {
    this.schema.alterTable('orders', (table) => {
      for (const name of orderColumns)
        table.decimal(`${name}_amount`, 20, 4).notNullable().defaultTo(0)
    })
    this.schema.alterTable('order_line_items', (table) => {
      for (const name of lineItemColumns)
        table.decimal(`${name}_amount`, 20, 4).notNullable().defaultTo(0)
    })
    this.defer(async (db) => {
      for (const name of orderColumns)
        await db.rawQuery(`UPDATE orders SET ${name}_amount = COALESCE(${name}_minor, 0) / 100.0`)
      for (const name of lineItemColumns)
        await db.rawQuery(
          `UPDATE order_line_items SET ${name}_amount = COALESCE(${name}_minor, 0) / 100.0`
        )
      for (const table of ['orders', 'order_line_items'])
        await db.rawQuery(`ALTER TABLE ${table} DROP COLUMN discount_minor`)
      await db.rawQuery('ALTER TABLE orders DROP COLUMN tax_minor')
    })
  }
}

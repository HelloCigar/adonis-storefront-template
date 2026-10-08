import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Staff-managed discount codes. A code takes a percentage or a fixed centavo amount off the
 * merchandise subtotal; shipping is never discounted. `times_used` counts unreleased
 * redemptions and is changed only by conditional updates inside the checkout transaction.
 *
 * A redemption keeps `customer_key` (the normalized email) only for once-per-customer codes
 * and clears it on release, so the unique index allows one active use per customer.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('discount_codes', (table) => {
      table.increments('id')
      table.string('code', 40).notNullable().unique()
      table.string('description', 255).nullable()
      table.enum('kind', ['percentage', 'fixed']).notNullable()
      table.integer('percent_off').nullable()
      table.bigInteger('amount_off_minor').nullable()
      table.bigInteger('minimum_subtotal_minor').notNullable().defaultTo(0)
      table.integer('usage_limit').nullable()
      table.integer('times_used').notNullable().defaultTo(0)
      table.boolean('once_per_customer').notNullable().defaultTo(false)
      table.boolean('active').notNullable().defaultTo(true)
      table.timestamp('starts_at').nullable()
      table.timestamp('ends_at').nullable()
      table
        .integer('created_by_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.check(
        "(kind = 'percentage' AND percent_off BETWEEN 1 AND 100 AND amount_off_minor IS NULL) OR (kind = 'fixed' AND amount_off_minor > 0 AND amount_off_minor <= 9007199254740991 AND percent_off IS NULL)"
      )
      table.check('minimum_subtotal_minor >= 0 AND minimum_subtotal_minor <= 9007199254740991')
      table.check('usage_limit IS NULL OR usage_limit > 0')
      table.check('times_used >= 0')
    })

    this.schema.createTable('discount_redemptions', (table) => {
      table.increments('id')
      table
        .integer('discount_code_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('discount_codes')
        .onDelete('RESTRICT')
      table
        .integer('order_id')
        .unsigned()
        .notNullable()
        .unique()
        .references('id')
        .inTable('orders')
        .onDelete('CASCADE')
      table.string('customer_key', 255).nullable()
      table.bigInteger('amount_minor').notNullable()
      table.timestamp('released_at').nullable()
      table.timestamp('created_at').notNullable()
      table.unique(['discount_code_id', 'customer_key'])
      table.check('amount_minor > 0 AND amount_minor <= 9007199254740991')
    })

    this.schema.alterTable('carts', (table) => {
      table.string('discount_code', 40).nullable()
    })
    this.schema.alterTable('orders', (table) => {
      table.string('discount_code', 40).nullable()
    })
  }

  async down() {
    this.defer(async (db) => {
      await db.rawQuery('ALTER TABLE orders DROP COLUMN discount_code')
      await db.rawQuery('ALTER TABLE carts DROP COLUMN discount_code')
    })
    this.schema.dropTable('discount_redemptions')
    this.schema.dropTable('discount_codes')
  }
}

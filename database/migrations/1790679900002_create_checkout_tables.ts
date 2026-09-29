import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('carts', (table) => {
      table.increments('id').notNullable()
      table.string('token', 64).notNullable().unique()
      table.integer('user_id').unsigned().nullable().references('users.id').onDelete('SET NULL')
      table.string('email', 254).nullable()
      table.string('currency_code', 3).notNullable()
      table.string('status', 24).notNullable().defaultTo('active')
      table.timestamp('expires_at').nullable()
      table.timestamp('completed_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['user_id', 'status'])
      table.index(['status', 'expires_at'])
    })

    this.schema.createTable('cart_lines', (table) => {
      table.increments('id').notNullable()
      table.integer('cart_id').unsigned().notNullable().references('carts.id').onDelete('CASCADE')
      table
        .integer('product_variant_id')
        .unsigned()
        .notNullable()
        .references('product_variants.id')
        .onDelete('CASCADE')
      table.integer('quantity').unsigned().notNullable().defaultTo(1)
      table.decimal('unit_price_amount', 20, 4).notNullable()
      table.string('currency_code', 3).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['cart_id', 'product_variant_id'])
      table.index('cart_id')
    })

    this.schema.createTable('orders', (table) => {
      table.increments('id').notNullable()
      table.integer('user_id').unsigned().nullable().references('users.id').onDelete('SET NULL')
      table
        .integer('cart_id')
        .unsigned()
        .nullable()
        .unique()
        .references('carts.id')
        .onDelete('SET NULL')
      table.string('number', 64).notNullable().unique()
      table.string('email', 254).notNullable()
      table.string('phone_number', 32).nullable()
      table.string('currency_code', 3).notNullable()
      table.string('financial_status', 32).notNullable().defaultTo('pending')
      table.string('fulfillment_status', 32).notNullable().defaultTo('unfulfilled')
      table.decimal('subtotal_amount', 20, 4).notNullable().defaultTo(0)
      table.decimal('discount_amount', 20, 4).notNullable().defaultTo(0)
      table.decimal('shipping_amount', 20, 4).notNullable().defaultTo(0)
      table.decimal('tax_amount', 20, 4).notNullable().defaultTo(0)
      table.decimal('total_amount', 20, 4).notNullable().defaultTo(0)
      table.text('note').nullable()
      table.timestamp('processed_at').notNullable()
      table.timestamp('cancelled_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['user_id', 'processed_at'])
      table.index('financial_status')
      table.index('fulfillment_status')
    })

    this.schema.createTable('order_addresses', (table) => {
      table.increments('id').notNullable()
      table.integer('order_id').unsigned().notNullable().references('orders.id').onDelete('CASCADE')
      table.string('type', 16).notNullable()
      table.string('first_name').nullable()
      table.string('last_name').nullable()
      table.string('company').nullable()
      table.string('address1').notNullable()
      table.string('address2').nullable()
      table.string('city').notNullable()
      table.string('zone_code', 64).nullable()
      table.string('country_code', 2).notNullable()
      table.string('postal_code', 32).notNullable()
      table.string('phone_number', 32).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['order_id', 'type'])
    })

    this.schema.createTable('order_line_items', (table) => {
      table.increments('id').notNullable()
      table.integer('order_id').unsigned().notNullable().references('orders.id').onDelete('CASCADE')
      table
        .integer('product_id')
        .unsigned()
        .nullable()
        .references('products.id')
        .onDelete('SET NULL')
      table
        .integer('product_variant_id')
        .unsigned()
        .nullable()
        .references('product_variants.id')
        .onDelete('SET NULL')
      table.string('title').notNullable()
      table.string('variant_title').nullable()
      table.string('sku').nullable()
      table.json('options').nullable()
      table.integer('quantity').unsigned().notNullable()
      table.decimal('unit_price_amount', 20, 4).notNullable()
      table.decimal('discount_amount', 20, 4).notNullable().defaultTo(0)
      table.decimal('total_amount', 20, 4).notNullable()
      table.string('currency_code', 3).notNullable()
      table.string('image_url', 2048).nullable()
      table.string('image_alt_text').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index('order_id')
      table.index('product_id')
      table.index('product_variant_id')
    })
  }

  async down() {
    this.schema.dropTable('order_line_items')
    this.schema.dropTable('order_addresses')
    this.schema.dropTable('orders')
    this.schema.dropTable('cart_lines')
    this.schema.dropTable('carts')
  }
}

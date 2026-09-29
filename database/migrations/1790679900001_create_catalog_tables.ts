import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('products', (table) => {
      table.increments('id').notNullable()
      table.string('title').notNullable()
      table.string('handle').notNullable().unique()
      table.text('description').nullable()
      table.text('description_html').nullable()
      table.string('vendor').nullable()
      table.string('product_type').nullable()
      table.string('status', 24).notNullable().defaultTo('draft')
      table.boolean('is_gift_card').notNullable().defaultTo(false)
      table.json('tags').nullable()
      table.string('seo_title').nullable()
      table.text('seo_description').nullable()
      table.timestamp('published_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['status', 'published_at'])
      table.index('vendor')
      table.index('product_type')
    })

    this.schema.createTable('product_variants', (table) => {
      table.increments('id').notNullable()
      table
        .integer('product_id')
        .unsigned()
        .notNullable()
        .references('products.id')
        .onDelete('CASCADE')
      table
        .string('featured_media_id')
        .nullable()
        .references('adonis_attachment_links.id')
        .onDelete('SET NULL')
      table.string('title').notNullable()
      table.string('sku').nullable().unique()
      table.string('barcode').nullable()
      table.json('options').nullable()
      table.decimal('price_amount', 20, 4).notNullable()
      table.decimal('compare_at_price_amount', 20, 4).nullable()
      table.string('currency_code', 3).notNullable()
      table.boolean('available_for_sale').notNullable().defaultTo(true)
      table.integer('inventory_quantity').nullable()
      table.integer('position').unsigned().notNullable().defaultTo(0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['product_id', 'position'])
      table.index(['available_for_sale', 'price_amount'])
    })

    this.schema.createTable('collections', (table) => {
      table.increments('id').notNullable()
      table.string('title').notNullable()
      table.string('handle').notNullable().unique()
      table.text('description').nullable()
      table.text('description_html').nullable()
      table.string('seo_title').nullable()
      table.text('seo_description').nullable()
      table.timestamp('published_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index('published_at')
    })

    this.schema.createTable('collection_products', (table) => {
      table
        .integer('collection_id')
        .unsigned()
        .notNullable()
        .references('collections.id')
        .onDelete('CASCADE')
      table
        .integer('product_id')
        .unsigned()
        .notNullable()
        .references('products.id')
        .onDelete('CASCADE')
      table.integer('position').unsigned().notNullable().defaultTo(0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.primary(['collection_id', 'product_id'])
      table.index(['collection_id', 'position'])
    })
  }

  async down() {
    this.schema.dropTable('collection_products')
    this.schema.dropTable('collections')
    this.schema.dropTable('product_variants')
    this.schema.dropTable('products')
  }
}

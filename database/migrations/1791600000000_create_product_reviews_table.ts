import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Customer reviews of products they received. Each account reviews a product once; a review
 * stays `pending` until staff approve or hide it, and only approved reviews are public.
 */
export default class extends BaseSchema {
  protected tableName = 'product_reviews'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('product_id').notNullable().references('products.id').onDelete('CASCADE')
      table.integer('user_id').notNullable().references('users.id').onDelete('CASCADE')
      // The delivered order that made the author eligible.
      table.integer('order_id').nullable().references('orders.id').onDelete('SET NULL')
      table.integer('rating').notNullable()
      table.string('title', 120).nullable()
      table.text('body').nullable()
      table.enum('status', ['pending', 'approved', 'hidden']).notNullable().defaultTo('pending')
      table.integer('moderated_by_id').nullable().references('users.id').onDelete('SET NULL')
      table.timestamp('moderated_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.unique(['product_id', 'user_id'])
      table.index(['product_id', 'status'])
      table.check('rating BETWEEN 1 AND 5')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

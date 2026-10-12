import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'store_settings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      // The store keeps one settings row. Null values fall back to the deployment's settings.
      table.integer('id').primary()
      table.string('store_name', 60).nullable()
      table.string('contact_email', 254).nullable()
      table.integer('shipping_minor').nullable()
      table.timestamp('identity_saved_at').nullable()
      table.timestamp('shipping_saved_at').nullable()
      table.timestamp('policies_saved_at').nullable()
      table.timestamp('setup_completed_at').nullable()
      table.timestamp('product_ticked_at').nullable()
      table.timestamp('staff_ticked_at').nullable()
      table.timestamp('policies_ticked_at').nullable()
      table.timestamp('checklist_dismissed_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.check('id = 1', [], 'store_settings_singleton')
      table.check(
        'shipping_minor IS NULL OR (shipping_minor >= 0 AND shipping_minor <= 10000000)',
        [],
        'store_settings_shipping_minor_range'
      )
    })

    this.defer(async (db) => {
      await db.table(this.tableName).insert({ id: 1, created_at: db.raw('CURRENT_TIMESTAMP') })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

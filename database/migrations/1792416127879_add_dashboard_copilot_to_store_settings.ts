import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'store_settings'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Admins switch the dashboard copilot on; every store starts with it off.
      table.boolean('dashboard_copilot_enabled').notNullable().defaultTo(false)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('dashboard_copilot_enabled')
    })
  }
}

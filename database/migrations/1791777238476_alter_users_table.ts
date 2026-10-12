import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    if (await this.schema.hasColumn(this.tableName, 'unverified_email')) {
      return
    }

    this.schema.alterTable(this.tableName, (table) => {
      table.string('unverified_email', 254).nullable().after('email').index()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('unverified_email')
    })
  }
}

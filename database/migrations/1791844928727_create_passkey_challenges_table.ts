import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'passkey_challenges'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('challenge', 128).notNullable().unique()
      table.string('purpose', 16).notNullable()
      table.string('user_id', 26).nullable().references('id').inTable('users').onDelete('CASCADE')
      table.timestamp('expires_at').notNullable().index()
      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

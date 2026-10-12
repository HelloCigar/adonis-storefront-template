import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'email_verification_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments()
      table
        .integer('tokenable_id')
        .notNullable()
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('email', 254).notNullable()
      table.string('hash', 80).notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('expires_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

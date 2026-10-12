import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'passkeys'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .string('user_id', 26)
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
        .index()
      table.text('credential_id').notNullable()
      table.string('credential_id_hash', 64).notNullable().unique()
      table.text('public_key').notNullable()
      table.bigInteger('counter').notNullable().defaultTo(0)
      table.text('transports').nullable()
      table.string('device_type', 16).notNullable()
      table.boolean('backed_up').notNullable()
      table.string('aaguid', 36).nullable()
      table.string('name', 100).notNullable()
      table.timestamp('last_used_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

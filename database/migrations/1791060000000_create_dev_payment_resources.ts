import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('dev_payment_resources', (table) => {
      table.string('id', 64).primary()
      table.string('kind', 16).notNullable()
      table.string('idempotency_key', 255).notNullable()
      table.string('input_hash', 64).notNullable()
      table.string('payment_id', 64).nullable().index()
      table.text('payload').notNullable()
      table.integer('version').notNullable().defaultTo(0)
      table.unique(['kind', 'idempotency_key'])
    })
  }

  async down() {
    this.schema.dropTable('dev_payment_resources')
  }
}

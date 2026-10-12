import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('refund_observations', (table) => {
      table.string('id', 26).notNullable().primary()
      table.string('provider', 64).notNullable()
      table.boolean('live_mode').notNullable()
      table.string('external_id').notNullable()
      table.string('external_payment_id').notNullable()
      table.bigInteger('amount_minor').notNullable()
      table.string('currency', 3).notNullable()
      table.enum('state', ['pending', 'succeeded', 'failed']).notNullable()
      table
        .string('refund_operation_id', 26)
        .nullable()
        .references('refund_operations.id')
        .onDelete('SET NULL')
      table.timestamps(true, true)
      table.unique(['provider', 'live_mode', 'external_id'])
      table.check('amount_minor > 0 AND amount_minor <= 9007199254740991')
    })
  }
  async down() {
    this.schema.dropTable('refund_observations')
  }
}

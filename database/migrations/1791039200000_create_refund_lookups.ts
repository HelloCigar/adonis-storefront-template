import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('refund_lookups', (table) => {
      table.increments('id')
      table.string('provider', 64).notNullable()
      table.boolean('live_mode').notNullable()
      table.string('external_id').notNullable()
      table
        .enum('state', ['pending', 'resolved', 'review_required'])
        .notNullable()
        .defaultTo('pending')
      table.string('claim_token').nullable()
      table.bigInteger('claim_expires_at_ms').nullable()
      table.string('last_error').nullable()
      table.timestamps(true, true)
      table.unique(['provider', 'live_mode', 'external_id'])
    })
  }

  async down() {
    this.schema.dropTable('refund_lookups')
  }
}

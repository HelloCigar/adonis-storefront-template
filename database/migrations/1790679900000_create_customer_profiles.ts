import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('users', (table) => {
      table.string('first_name').nullable()
      table.string('last_name').nullable()
      table.string('phone_number', 32).nullable().unique()
      table.boolean('accepts_marketing').notNullable().defaultTo(false)
    })

    this.schema.createTable('customer_addresses', (table) => {
      table.increments('id').notNullable()
      table.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE')
      table.string('first_name').nullable()
      table.string('last_name').nullable()
      table.string('company').nullable()
      table.string('address1').notNullable()
      table.string('address2').nullable()
      table.string('city').notNullable()
      table.string('zone_code', 64).nullable()
      table.string('country_code', 2).notNullable()
      table.string('postal_code', 32).notNullable()
      table.string('phone_number', 32).nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index('user_id')
    })

    this.schema.alterTable('users', (table) => {
      table
        .integer('default_address_id')
        .unsigned()
        .nullable()
        .unique()
        .references('customer_addresses.id')
        .onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable('users', (table) => {
      table.dropColumn('default_address_id')
    })

    this.schema.dropTable('customer_addresses')

    this.schema.alterTable('users', (table) => {
      table.dropColumn('accepts_marketing')
      table.dropColumn('phone_number')
      table.dropColumn('last_name')
      table.dropColumn('first_name')
    })
  }
}

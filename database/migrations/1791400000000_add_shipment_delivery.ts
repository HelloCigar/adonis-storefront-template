import { BaseSchema } from '@adonisjs/lucid/schema'
import type { Knex } from 'knex'

const shipmentStates = ['pending', 'packing', 'shipped', 'delivered', 'cancelled']
const notificationKinds = ['receipt', 'shipment', 'delivery']
const sqliteDialects = new Set(['sqlite3', 'better-sqlite3', 'libsql'])

/**
 * Staff confirm delivery after dispatch. `delivered` follows `shipped` and keeps every
 * post-dispatch guard in place; the delivery email is its own once-per-order notification.
 *
 * SQLite cannot change a CHECK constraint in place, and Knex's `.alter()` keeps the old
 * constraint beside the new one there. SQLite rebuilds both tables instead; nothing
 * references them, so the swap keeps every foreign key intact.
 */
export default class extends BaseSchema {
  async up() {
    await this.define(shipmentStates, notificationKinds, true)
  }

  async down() {
    this.defer(async (db) => {
      await db.from('order_notifications').where('kind', 'delivery').delete()
      await db.from('shipments').where('state', 'delivered').update({ state: 'shipped' })
    })
    await this.define(
      shipmentStates.filter((state) => state !== 'delivered'),
      notificationKinds.filter((kind) => kind !== 'delivery'),
      false
    )
  }

  private async define(states: string[], kinds: string[], delivery: boolean) {
    if (!sqliteDialects.has(this.db.dialect.name)) {
      this.schema.alterTable('shipments', (table) => {
        table.enum('state', states).notNullable().defaultTo('pending').alter()
        if (delivery) table.timestamp('delivered_at').nullable()
        else table.dropColumn('delivered_at')
      })
      this.schema.alterTable('order_notifications', (table) => {
        table.enum('kind', kinds).notNullable().alter()
      })
      return
    }

    this.rebuild(
      'shipments',
      (table) => {
        table.increments('id')
        table.integer('order_id').notNullable().references('orders.id').onDelete('CASCADE')
        table.enum('state', states).notNullable().defaultTo('pending')
        table.string('carrier').nullable()
        table.string('tracking_number').nullable()
        table.string('tracking_url', 2048).nullable()
        table.integer('actor_id').nullable().references('users.id').onDelete('SET NULL')
        table.timestamp('packing_at').nullable()
        table.timestamp('shipped_at').nullable()
        if (delivery) table.timestamp('delivered_at').nullable()
        table.timestamps(true, true)
      },
      (table) => table.unique(['order_id'], { indexName: 'shipments_order_id_unique' }),
      [
        'id',
        'order_id',
        'state',
        'carrier',
        'tracking_number',
        'tracking_url',
        'actor_id',
        'packing_at',
        'shipped_at',
        'created_at',
        'updated_at',
      ]
    )
    this.rebuild(
      'order_notifications',
      (table) => {
        table.increments('id')
        table.integer('order_id').notNullable().references('orders.id').onDelete('CASCADE')
        table.enum('kind', kinds).notNullable()
        table.enum('state', ['pending', 'sent', 'failed']).notNullable().defaultTo('pending')
        table.timestamp('sent_at').nullable()
        table.string('last_error').nullable()
        table.timestamps(true, true)
        table.string('claim_token', 64).nullable()
        table.bigInteger('claim_expires_at_ms').nullable()
      },
      (table) =>
        table.unique(['order_id', 'kind'], {
          indexName: 'order_notifications_order_id_kind_unique',
        }),
      [
        'id',
        'order_id',
        'kind',
        'state',
        'sent_at',
        'last_error',
        'created_at',
        'updated_at',
        'claim_token',
        'claim_expires_at_ms',
      ]
    )
  }

  /** Copies rows into a table with the new definition, then swaps it in under the old name. */
  private rebuild(
    name: string,
    columns: (table: Knex.CreateTableBuilder) => void,
    indexes: (table: Knex.AlterTableBuilder) => void,
    copied: string[]
  ) {
    const next = `${name}_next`
    this.schema.createTable(next, columns)
    this.defer(async (db) => {
      const list = copied.map((column) => `\`${column}\``).join(', ')
      await db.rawQuery(`INSERT INTO \`${next}\` (${list}) SELECT ${list} FROM \`${name}\``)
    })
    this.schema.dropTable(name)
    this.schema.renameTable(next, name)
    this.schema.alterTable(name, indexes)
  }
}

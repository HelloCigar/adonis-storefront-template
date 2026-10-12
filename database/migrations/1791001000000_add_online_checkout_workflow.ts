import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('carts', (table) => {
      table.integer('version').notNullable().defaultTo(0)
      table.string('submission_key', 64).nullable().unique()
    })
    this.schema.alterTable('product_variants', (table) => {
      table
        .specificType(
          'inventory_reserved_quantity',
          'integer CHECK (inventory_reserved_quantity >= 0 AND (inventory_quantity IS NULL OR inventory_quantity >= inventory_reserved_quantity))'
        )
        .notNullable()
        .defaultTo(0)
    })
    this.schema.alterTable('orders', (table) => {
      table.string('public_id', 64).nullable().unique()
      table.string('submission_key', 64).nullable().unique()
      table.string('input_fingerprint', 64).nullable()
      table.enum('source', ['legacy', 'online']).notNullable().defaultTo('legacy')
      table
        .enum('lifecycle_state', [
          'pending_payment',
          'confirmed',
          'expired',
          'cancelled',
          'review_required',
        ])
        .notNullable()
        .defaultTo('pending_payment')
      table.integer('version').notNullable().defaultTo(0)
      table.timestamp('paid_at').nullable()
      table.string('review_reason').nullable()
      for (const name of ['subtotal_minor', 'shipping_minor', 'total_minor'])
        table.bigInteger(name).nullable()
    })
    this.schema.alterTable('order_line_items', (table) => {
      table.bigInteger('unit_price_minor').nullable()
      table.bigInteger('total_minor').nullable()
    })
    this.schema.createTable('payment_attempts', (table) => {
      table.string('id', 26).notNullable().primary()
      table.string('public_id', 64).notNullable().unique()
      table.string('order_id', 26).notNullable().references('orders.id').onDelete('CASCADE')
      table.string('provider', 64).notNullable()
      table.boolean('live_mode').notNullable()
      table.bigInteger('amount_minor').notNullable()
      table.string('currency', 3).notNullable()
      table
        .enum('state', ['creating', 'pending', 'paid', 'closing', 'expired', 'failed', 'unknown'])
        .notNullable()
      table.json('request_snapshot').notNullable()
      table.string('idempotency_key', 128).notNullable().unique()
      table.string('external_id').nullable()
      table.string('checkout_url', 2048).nullable()
      table.bigInteger('expires_at_ms').notNullable()
      table.string('close_reason', 24).nullable()
      table.integer('version').notNullable().defaultTo(0)
      table.string('claim_token', 64).nullable()
      table.bigInteger('claim_expires_at_ms').nullable()
      table.string('last_error').nullable()
      table.boolean('needs_review').notNullable().defaultTo(false)
      table.timestamps(true, true)
      table.unique(['provider', 'live_mode', 'external_id'])
      table.index(['state', 'expires_at_ms'])
      table.index('order_id')
      table.check('amount_minor > 0 AND amount_minor <= 9007199254740991')
    })
    this.schema.createTable('payments', (table) => {
      table.string('id', 26).notNullable().primary()
      table.string('order_id', 26).nullable().references('orders.id').onDelete('SET NULL')
      table
        .string('attempt_id', 26)
        .nullable()
        .references('payment_attempts.id')
        .onDelete('SET NULL')
      table.string('provider', 64).notNullable()
      table.boolean('live_mode').notNullable()
      table.string('external_id').notNullable()
      table.bigInteger('amount_minor').notNullable()
      table.string('currency', 3).notNullable()
      table.enum('disposition', ['accepted', 'overpayment', 'review_required']).notNullable()
      table.timestamp('captured_at').notNullable()
      table.timestamps(true, true)
      table.unique(['provider', 'live_mode', 'external_id'])
      table.index('order_id')
      table.check('amount_minor > 0 AND amount_minor <= 9007199254740991')
    })
    this.schema.createTable('stock_reservations', (table) => {
      table.string('id', 26).notNullable().primary()
      table.string('order_id', 26).notNullable().references('orders.id').onDelete('CASCADE')
      table
        .string('product_variant_id', 26)
        .nullable()
        .references('product_variants.id')
        .onDelete('SET NULL')
      table.integer('quantity').notNullable()
      table.enum('state', ['reserved', 'consumed', 'released']).notNullable()
      table.bigInteger('expires_at_ms').notNullable()
      table.timestamp('settled_at').nullable()
      table.timestamp('restocked_at').nullable()
      table.timestamps(true, true)
      table.unique(['order_id', 'product_variant_id'])
      table.index(['state', 'expires_at_ms'])
      table.check('quantity > 0')
    })
    this.schema.createTable('shipments', (table) => {
      table.string('id', 26).notNullable().primary()
      table
        .string('order_id', 26)
        .notNullable()
        .unique()
        .references('orders.id')
        .onDelete('CASCADE')
      table
        .enum('state', ['pending', 'packing', 'shipped', 'cancelled'])
        .notNullable()
        .defaultTo('pending')
      table.string('carrier').nullable()
      table.string('tracking_number').nullable()
      table.string('tracking_url', 2048).nullable()
      table.string('actor_id', 26).nullable().references('users.id').onDelete('SET NULL')
      table.timestamp('packing_at').nullable()
      table.timestamp('shipped_at').nullable()
      table.timestamps(true, true)
    })
    this.schema.createTable('refund_operations', (table) => {
      table.string('id', 26).notNullable().primary()
      table.string('order_id', 26).notNullable().references('orders.id').onDelete('CASCADE')
      table.string('payment_id', 26).notNullable().references('payments.id').onDelete('RESTRICT')
      table.string('provider', 64).notNullable()
      table.boolean('live_mode').notNullable()
      table.bigInteger('amount_minor').notNullable()
      table.enum('reason', ['duplicate', 'fraudulent', 'requested_by_customer']).notNullable()
      table.string('idempotency_key', 128).notNullable().unique()
      table.string('external_id').nullable()
      table.enum('state', ['requested', 'pending', 'succeeded', 'failed', 'unknown']).notNullable()
      table.string('actor_id', 26).nullable().references('users.id').onDelete('SET NULL')
      table.string('claim_token', 64).nullable()
      table.bigInteger('claim_expires_at_ms').nullable()
      table.boolean('needs_review').notNullable().defaultTo(false)
      table.string('last_error').nullable()
      table.timestamps(true, true)
      table.index('order_id')
      table.unique(['provider', 'live_mode', 'external_id'])
      table.check('amount_minor > 0 AND amount_minor <= 9007199254740991')
    })
    this.schema.createTable('order_access_grants', (table) => {
      table.string('id', 26).notNullable().primary()
      table.string('order_id', 26).notNullable().references('orders.id').onDelete('CASCADE')
      table.string('token_hash', 64).notNullable().unique()
      table.bigInteger('expires_at_ms').notNullable()
      table.timestamp('revoked_at').nullable()
      table.timestamps(true, true)
    })
    this.schema.createTable('workflow_outbox', (table) => {
      table.string('id', 26).notNullable().primary()
      table.string('operation_key', 200).notNullable().unique()
      table.string('kind', 40).notNullable()
      table.string('entity_id', 26).notNullable()
      table.bigInteger('available_at_ms').notNullable()
      table.integer('publication_attempts').notNullable().defaultTo(0)
      table.string('claim_token', 64).nullable()
      table.bigInteger('claim_expires_at_ms').nullable()
      table.timestamp('published_at').nullable()
      table.string('job_id').nullable()
      table.string('last_error').nullable()
      table.timestamps(true, true)
      table.index(['published_at', 'available_at_ms'])
    })
    this.schema.createTable('order_activities', (table) => {
      table.string('id', 26).notNullable().primary()
      table.string('order_id', 26).notNullable().references('orders.id').onDelete('CASCADE')
      table.string('actor_id', 26).nullable().references('users.id').onDelete('SET NULL')
      table.string('source', 24).notNullable()
      table.string('event', 64).notNullable()
      table.json('details').nullable()
      table.timestamps(true, true)
      table.index('order_id')
    })
    this.schema.createTable('order_notifications', (table) => {
      table.string('id', 26).notNullable().primary()
      table.string('order_id', 26).notNullable().references('orders.id').onDelete('CASCADE')
      table.enum('kind', ['receipt', 'shipment']).notNullable()
      table.enum('state', ['pending', 'sent', 'failed']).notNullable().defaultTo('pending')
      table.timestamp('sent_at').nullable()
      table.string('last_error').nullable()
      table.timestamps(true, true)
      table.unique(['order_id', 'kind'])
    })
    this.defer(async (db) => {
      await db.rawQuery(
        "CREATE UNIQUE INDEX one_active_order_attempt ON payment_attempts(order_id) WHERE state IN ('creating', 'pending', 'unknown', 'closing')"
      )
      await db.rawQuery(
        "CREATE UNIQUE INDEX one_accepted_order_payment ON payments(order_id) WHERE disposition = 'accepted'"
      )
      await db.from('orders').whereNotNull('cancelled_at').update({ lifecycle_state: 'cancelled' })
      await db
        .from('orders')
        .whereNull('cancelled_at')
        .whereIn('financial_status', ['paid', 'partially_refunded', 'refunded'])
        .update({ lifecycle_state: 'confirmed' })
      // The new column's CHECK also rejects unsafe direct inventory updates.
      await db.rawQuery(
        "CREATE TRIGGER prevent_reserved_variant_delete BEFORE DELETE ON product_variants WHEN OLD.inventory_reserved_quantity > 0 BEGIN SELECT RAISE(ABORT, 'Variant has active stock reservations'); END"
      )
    })
  }

  async down() {
    this.schema.raw('DROP TRIGGER IF EXISTS prevent_reserved_variant_delete')
    for (const table of [
      'order_notifications',
      'order_activities',
      'workflow_outbox',
      'order_access_grants',
      'refund_operations',
      'shipments',
      'stock_reservations',
      'payments',
      'payment_attempts',
    ])
      this.schema.dropTable(table)
    this.schema.alterTable('order_line_items', (table) =>
      table.dropColumns('unit_price_minor', 'total_minor')
    )
    this.schema.alterTable('orders', (table) =>
      table.dropColumns(
        'public_id',
        'submission_key',
        'input_fingerprint',
        'source',
        'lifecycle_state',
        'version',
        'paid_at',
        'review_reason',
        'subtotal_minor',
        'shipping_minor',
        'total_minor'
      )
    )
    this.schema.alterTable('product_variants', (table) =>
      table.dropColumn('inventory_reserved_quantity')
    )
    this.schema.alterTable('carts', (table) => table.dropColumns('version', 'submission_key'))
  }
}

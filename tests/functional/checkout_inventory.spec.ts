import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import InventoryService from '#services/catalog/inventory_service'
import CartService from '#services/checkout/cart_service'
import StockReservation from '#models/checkout/stock_reservation'
import WorkflowOutbox from '#models/checkout/workflow_outbox'
import OutboxService from '#services/checkout/outbox_service'
import emitter from '@adonisjs/core/services/emitter'
import WorkflowOutboxReady from '#events/checkout/workflow_outbox_ready'
import Order from '#models/checkout/order'
import { ProductVariantFactory } from '../../database/factories/product_variant_factory.js'
import { OrderFactory } from '../../database/factories/order_factory.js'

test.group('Checkout stock invariants', (group) => {
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate()
    return async () => {
      const inventory = await app.container.make(InventoryService)
      const held = await StockReservation.query().where('state', 'reserved')
      for (const orderId of new Set(held.map((row) => row.orderId))) {
        await db.transaction((trx) => inventory.release(trx, orderId))
      }
      await cleanup()
    }
  })

  test('reserves the final unit for one competing buyer without overselling', async ({
    assert,
  }) => {
    const inventory = await app.container.make(InventoryService)
    const variant = await ProductVariantFactory.merge({
      inventoryQuantity: 1,
      availableForSale: true,
    }).create()
    const orders = await OrderFactory.createMany(2)
    const results = await Promise.allSettled(
      orders.map((order) =>
        db.transaction((trx) =>
          inventory.reserve(
            trx,
            order.id,
            [{ variantId: variant.id, quantity: 1 }],
            Date.now() + 900000
          )
        )
      )
    )
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
    assert.equal(results.filter((result) => result.status === 'rejected').length, 1)
    await variant.refresh()
    assert.equal(variant.inventoryQuantity, 1)
    assert.equal(variant.inventoryReservedQuantity, 1)
    assert.equal(variant.quantityAvailable, 0)
    assert.isFalse(variant.isSellable)
  })

  test('rolls back all holds when one item lacks stock and skips untracked counters', async ({
    assert,
  }) => {
    const inventory = await app.container.make(InventoryService)
    const first = await ProductVariantFactory.merge({
      inventoryQuantity: 3,
      availableForSale: true,
    }).create()
    const second = await ProductVariantFactory.merge({
      inventoryQuantity: 0,
      availableForSale: true,
    }).create()
    const untracked = await ProductVariantFactory.merge({
      inventoryQuantity: null,
      availableForSale: true,
    }).create()
    const order = await OrderFactory.create()
    await assert.rejects(() =>
      db.transaction((trx) =>
        inventory.reserve(
          trx,
          order.id,
          [
            { variantId: first.id, quantity: 2 },
            { variantId: second.id, quantity: 1 },
          ],
          Date.now()
        )
      )
    )
    await first.refresh()
    assert.equal(first.inventoryReservedQuantity, 0)
    assert.isEmpty(await StockReservation.all())
    await db.transaction((trx) =>
      inventory.reserve(trx, order.id, [{ variantId: untracked.id, quantity: 5 }], Date.now())
    )
    assert.isEmpty(await StockReservation.all())
    await untracked.refresh()
    assert.isNull(untracked.quantityAvailable)
  })

  test('consumes, releases and restocks once and rejects unsafe direct inventory writes/deletes', async ({
    assert,
  }) => {
    const inventory = await app.container.make(InventoryService)
    const variant = await ProductVariantFactory.merge({
      inventoryQuantity: 5,
      availableForSale: true,
    }).create()
    const order = await OrderFactory.create()
    await db.transaction((trx) =>
      inventory.reserve(trx, order.id, [{ variantId: variant.id, quantity: 2 }], Date.now())
    )
    await assert.rejects(() =>
      db.from('product_variants').where('id', variant.id).update({ inventory_quantity: 1 })
    )
    await assert.rejects(() => db.from('product_variants').where('id', variant.id).delete())
    await db.transaction((trx) => inventory.consume(trx, order.id))
    await db.transaction((trx) => inventory.consume(trx, order.id))
    await db.transaction((trx) => inventory.release(trx, order.id))
    await variant.refresh()
    assert.equal(variant.inventoryQuantity, 3)
    assert.equal(variant.inventoryReservedQuantity, 0)
    await db.transaction((trx) => inventory.restock(trx, order.id))
    await db.transaction((trx) => inventory.restock(trx, order.id))
    await variant.refresh()
    assert.equal(variant.inventoryQuantity, 5)
    const unpaid = await OrderFactory.create()
    await db.transaction((trx) =>
      inventory.reserve(trx, unpaid.id, [{ variantId: variant.id, quantity: 1 }], Date.now())
    )
    await db.transaction((trx) => inventory.release(trx, unpaid.id))
    await db.transaction((trx) => inventory.release(trx, unpaid.id))
    await variant.refresh()
    assert.equal(variant.inventoryQuantity, 5)
    assert.equal(variant.inventoryReservedQuantity, 0)
    await assert.rejects(() => db.transaction((trx) => inventory.consume(trx, unpaid.id)))
  })

  test('rejects changes to a submitted cart and retains its submission key', async ({ assert }) => {
    const carts = await app.container.make(CartService)
    const cart = await carts.findOrCreate('test-frozen-token')
    assert.isString(cart.submissionKey)
    cart.status = 'submitted'
    await cart.save()
    await assert.rejects(() => carts.findOrCreate('test-frozen-token'), 'Validation failure')
    await assert.rejects(() => carts.remove('test-frozen-token', undefined, 1))
    await cart.refresh()
    assert.equal(cart.status, 'submitted')
    assert.equal(cart.version, 0)
  })

  test('persists outbox intent with business writes and reuses a key without replacing its entity', async ({
    assert,
  }) => {
    using events = emitter.fake([WorkflowOutboxReady])
    const outbox = await app.container.make(OutboxService)
    const order = await OrderFactory.create()
    await order.refresh()
    const originalVersion = order.version
    await assert.rejects(() =>
      db.transaction(async (trx) => {
        await Order.query({ client: trx }).where('id', order.id).increment('version', 1)
        await outbox.record(trx, {
          key: 'checkout:rollback',
          kind: 'create_checkout',
          entityId: 42,
        })
        throw new Error('rollback')
      })
    )
    await order.refresh()
    assert.equal(order.version, originalVersion)
    assert.isEmpty(await WorkflowOutbox.all())
    events.assertNotEmitted(WorkflowOutboxReady)
    const first = await db.transaction((trx) =>
      outbox.record(trx, { key: 'checkout:42', kind: 'create_checkout', entityId: 42 })
    )
    const replay = await db.transaction((trx) =>
      outbox.record(trx, { key: 'checkout:42', kind: 'create_checkout', entityId: 42 })
    )
    assert.equal(first.id, replay.id)
    assert.isNull(replay.publishedAt)
    events.assertEmittedCount(WorkflowOutboxReady, 2)
    await assert.rejects(
      () =>
        db.transaction((trx) =>
          outbox.record(trx, { key: 'checkout:42', kind: 'create_checkout', entityId: 43 })
        ),
      'Workflow key is already used for another operation'
    )
    assert.lengthOf(await WorkflowOutbox.all(), 1)
    events.assertEmittedCount(WorkflowOutboxReady, 2)
  })
})

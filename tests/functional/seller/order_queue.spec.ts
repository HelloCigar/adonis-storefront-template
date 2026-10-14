import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { UserFactory } from '#database/factories/user_factory'
import type { QueueRow } from '#tests/helpers/types'
import {
  ago,
  millis,
  staffUser,
  queue,
  rowFor,
  onlineOrder,
  legacyOrder,
  openAttempt,
  refund,
} from '#tests/helpers/order_queue'

test.group('Staff order queue', (group) => {
  // truncate() empties the tables when its cleanup runs after each test. A trigger refuses to
  // delete variants that still hold reservations, so release them first.
  group.each.setup(async () => {
    const truncate = await testUtils.db().truncate()
    return async () => {
      await db.from('product_variants').update({ inventory_reserved_quantity: 0 })
      await truncate()
    }
  })

  test('puts a paid online order with a pending shipment in To pack', async ({
    client,
    assert,
  }) => {
    const paidAt = ago({ days: 2 })
    const order = await onlineOrder({ paidAt })

    const row = await rowFor(client, order)
    assert.deepEqual(row.stages, ['to_pack'])
    assert.equal(row.nextStep, 'pack')
    assert.equal(row.number, order.number)
    assert.equal(millis(row.waitingSince), paidAt.toMillis())
  })

  test('follows an online shipment from packing to shipped to delivered', async ({
    client,
    assert,
  }) => {
    const packingAt = ago({ hours: 5 })
    const shippedAt = ago({ hours: 3 })
    const deliveredAt = ago({ hours: 1 })
    const packing = await onlineOrder({}, { state: 'packing', packingAt })
    const shipped = await onlineOrder({}, { state: 'shipped', packingAt, shippedAt })
    const delivered = await onlineOrder(
      {},
      { state: 'delivered', packingAt, shippedAt, deliveredAt }
    )

    const toShip = await rowFor(client, packing)
    assert.deepEqual(toShip.stages, ['to_ship'])
    assert.equal(toShip.nextStep, 'add_tracking')
    assert.equal(millis(toShip.waitingSince), packingAt.toMillis())

    const inTransit = await rowFor(client, shipped)
    assert.deepEqual(inTransit.stages, ['in_transit'])
    assert.equal(inTransit.nextStep, 'confirm_delivery')
    assert.equal(millis(inTransit.waitingSince), shippedAt.toMillis())

    const done = await rowFor(client, delivered)
    assert.deepEqual(done.stages, ['delivered'])
    assert.equal(done.nextStep, 'done')
    assert.isNull(done.waitingSince)
  })

  test('sorts manually recorded orders by fulfillment status', async ({ client, assert }) => {
    const unfulfilled = await legacyOrder({
      fulfillmentStatus: 'unfulfilled',
      processedAt: ago({ days: 4 }),
    })
    const partial = await legacyOrder({ fulfillmentStatus: 'partial' })
    const fulfilled = await legacyOrder({ fulfillmentStatus: 'fulfilled' })
    const cancelled = await legacyOrder({
      fulfillmentStatus: 'unfulfilled',
      cancelledAt: ago({ days: 1 }),
    })

    const waiting = await rowFor(client, unfulfilled)
    assert.deepEqual(waiting.stages, ['to_pack'])
    assert.equal(waiting.nextStep, 'pack')
    // With no paid date, the wait starts when the order was recorded.
    assert.equal(millis(waiting.waitingSince), unfulfilled.processedAt.toMillis())

    const half = await rowFor(client, partial)
    assert.deepEqual(half.stages, ['to_pack'])
    assert.equal(half.nextStep, 'pack')

    const done = await rowFor(client, fulfilled)
    assert.deepEqual(done.stages, ['delivered'])
    assert.equal(done.nextStep, 'done')
    assert.isNull(done.waitingSince)

    const closed = await rowFor(client, cancelled)
    assert.deepEqual(closed.stages, [])
    assert.equal(closed.nextStep, 'closed')
    assert.isNull(closed.waitingSince)
  })

  test('lets a payment review outrank the fulfillment step', async ({ client, assert }) => {
    const unpaidAttempt = await onlineOrder()
    await openAttempt(unpaidAttempt, { state: 'unknown', needsReview: true })
    const unknownRefund = await onlineOrder()
    await refund(unknownRefund, { state: 'unknown' })
    const flaggedRefund = await onlineOrder()
    await refund(flaggedRefund, { state: 'pending', needsReview: true })

    for (const order of [unpaidAttempt, unknownRefund, flaggedRefund]) {
      const row = await rowFor(client, order)
      assert.deepEqual(row.stages, ['to_pack', 'needs_attention'])
      assert.equal(row.nextStep, 'review_payment')
    }
  })

  test('does not flag settled or unflagged payments', async ({ client, assert }) => {
    const settled = await onlineOrder()
    await openAttempt(settled, { state: 'paid', needsReview: true })
    const quietAttempt = await onlineOrder()
    await openAttempt(quietAttempt, { state: 'unknown', needsReview: false })
    const quietRefund = await onlineOrder()
    await refund(quietRefund, { state: 'pending', needsReview: false })

    for (const order of [settled, quietAttempt, quietRefund]) {
      const row = await rowFor(client, order)
      assert.deepEqual(row.stages, ['to_pack'])
      assert.equal(row.nextStep, 'pack')
    }
  })

  test('puts orders in review_required lifecycle in Needs attention', async ({
    client,
    assert,
  }) => {
    const order = await onlineOrder({ lifecycleState: 'review_required' })

    const row = await rowFor(client, order)
    assert.include(row.stages, 'needs_attention')
    assert.equal(row.nextStep, 'review_payment')
  })

  test('shows unpaid and closed online orders outside every stage', async ({ client, assert }) => {
    const pending = await onlineOrder(
      { lifecycleState: 'pending_payment', financialStatus: 'pending', paidAt: null },
      null
    )
    const cancelled = await onlineOrder(
      { lifecycleState: 'cancelled', financialStatus: 'voided', paidAt: null },
      null
    )
    const expired = await onlineOrder(
      { lifecycleState: 'expired', financialStatus: 'pending', paidAt: null },
      null
    )

    const waiting = await rowFor(client, pending)
    assert.deepEqual(waiting.stages, [])
    assert.equal(waiting.nextStep, 'await_payment')
    assert.equal(millis(waiting.waitingSince), pending.processedAt.toMillis())

    for (const order of [cancelled, expired]) {
      const row = await rowFor(client, order)
      assert.deepEqual(row.stages, [])
      assert.equal(row.nextStep, 'closed')
      assert.isNull(row.waitingSince)
    }
  })

  test('reads the stage from the query string and falls back to To pack', async ({
    client,
    assert,
  }) => {
    const staff = await staffUser()
    const stageOf = async (qs: Record<string, string> = {}) => {
      const { stage } = await queue(client, staff, qs)
      return stage
    }
    assert.equal(await stageOf(), 'to_pack')
    for (const stage of [
      'to_pack',
      'to_ship',
      'in_transit',
      'delivered',
      'needs_attention',
      'all',
    ]) {
      assert.equal(await stageOf({ stage }), stage)
    }
    assert.equal(await stageOf({ stage: 'bogus' }), 'to_pack')
    assert.equal(await stageOf({ stage: '' }), 'to_pack')
  })

  test('lists every order with its customer, newest first', async ({ client, assert }) => {
    const staff = await staffUser()
    const buyer = await UserFactory.merge({ fullName: 'Pat Buyer' }).create()
    const oldest = await onlineOrder({ userId: buyer.id, processedAt: ago({ days: 5 }) })
    const newest = await legacyOrder({ processedAt: ago({ days: 1 }) })
    const middle = await onlineOrder(
      {
        lifecycleState: 'pending_payment',
        financialStatus: 'pending',
        processedAt: ago({ days: 3 }),
      },
      null
    )

    const { orders } = await queue(client, staff)
    assert.deepEqual(
      orders.map((row) => row.id),
      [newest.id, middle.id, oldest.id]
    )
    assert.equal(orders[2].customer, 'Pat Buyer')
    // Guest and manual orders have no account to name.
    assert.isNull(orders[0].customer)
    assert.isNull(orders[1].customer)
  })

  test('keeps the staff order queue closed to guests and customers', async ({ client, route }) => {
    const customer = await UserFactory.merge({ role: 'customer' }).create()

    const guest = await client.get(route('seller.orders.index')).redirects(0)
    guest.assertStatus(302)
    guest.assertHeader('location', route('session.create'))

    const denied = await client.get(route('seller.orders.index')).loginAs(customer).accept('json')
    denied.assertStatus(403)
  })
  test('gives the order page the same stage and next step as its queue row', async ({
    client,
    assert,
    route,
  }) => {
    const packingAt = ago({ hours: 4 })
    const order = await onlineOrder({}, { state: 'packing', packingAt })
    const staff = await staffUser()

    const page = await client
      .get(route('seller.orders.show', { id: order.id }))
      .loginAs(staff)
      .withInertia()
    page.assertStatus(200)
    const detail = (page.inertiaProps as { queue: QueueRow }).queue
    const row = await rowFor(client, order)
    assert.deepEqual(detail.stages, ['to_ship'])
    assert.equal(detail.nextStep, 'add_tracking')
    assert.deepEqual(
      { stages: detail.stages, nextStep: detail.nextStep, waitingSince: detail.waitingSince },
      { stages: row.stages, nextStep: row.nextStep, waitingSince: row.waitingSince }
    )
  })
})

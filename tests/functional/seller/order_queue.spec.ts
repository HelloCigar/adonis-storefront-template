import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import type Order from '#models/checkout/order'
import Shipment from '#models/checkout/shipment'
import Attempt from '#models/payments/attempt'
import Payment from '#models/payments/payment'
import RefundOperation from '#models/payments/refund_operation'
import type { ShipmentState } from '#services/checkout/state_service'
import { OrderFactory } from '#database/factories/order_factory'
import { UserFactory } from '#database/factories/user_factory'

/** Whole seconds, so values survive the SQLite round trip unchanged. */
const ago = (values: { days?: number; hours?: number; minutes?: number }) =>
  DateTime.utc().minus(values).startOf('second')
const millis = (iso: string | null) => (iso ? DateTime.fromISO(iso).toMillis() : null)

interface QueueRow {
  id: number
  number: string
  customer: string | null
  stages: string[]
  nextStep: string
  waitingSince: string | null
}

const staffUser = () => UserFactory.merge({ role: 'staff' }).create()

/** Opens the staff order list and returns the page props. */
async function queue(client: any, staff: Awaited<ReturnType<typeof staffUser>>, qs = '') {
  const page = await client.get(`/seller/orders${qs}`).loginAs(staff).withInertia()
  page.assertStatus(200)
  return page.inertiaProps as { orders: QueueRow[]; stage: string }
}

/** The queue row for one order. */
async function rowFor(client: any, order: Order) {
  const { orders } = await queue(client, await staffUser())
  return orders.find((row) => row.id === order.id)!
}

/** An online order that has been paid and confirmed, with an optional shipment. */
async function onlineOrder(
  values: Partial<Order> = {},
  shipment: (Partial<Shipment> & { state: ShipmentState }) | null = { state: 'pending' }
) {
  const order = await OrderFactory.merge({
    source: 'online',
    lifecycleState: 'confirmed',
    financialStatus: 'paid',
    paidAt: ago({ days: 3 }),
    processedAt: ago({ days: 3 }),
    ...values,
  }).create()
  if (shipment) await Shipment.create({ orderId: order.id, ...shipment })
  return order
}

/** A manually recorded order; the database defaults these to the legacy source. */
const legacyOrder = (values: Partial<Order> = {}) =>
  OrderFactory.merge({ source: 'legacy', financialStatus: 'paid', ...values }).create()

function openAttempt(order: Order, values: Partial<Attempt> = {}) {
  return Attempt.create({
    publicId: randomUUID(),
    orderId: order.id,
    provider: 'queue-test',
    liveMode: false,
    amountMinor: 1000,
    currency: 'PHP',
    state: 'pending',
    version: 0,
    idempotencyKey: randomUUID(),
    expiresAtMs: Date.now() + 60_000,
    replayScope: 'resource',
    needsReview: false,
    requestSnapshot: {
      reference: randomUUID(),
      currency: 'PHP',
      items: [{ name: 'Order', unitAmount: 1000, quantity: 1 }],
    } as any,
    ...values,
  })
}

async function refund(order: Order, values: Partial<RefundOperation> = {}) {
  const payment = await Payment.create({
    orderId: order.id,
    provider: 'queue-test',
    liveMode: false,
    externalId: randomUUID(),
    amountMinor: 1000,
    currency: 'PHP',
    disposition: 'accepted',
    capturedAt: DateTime.utc(),
  })
  return RefundOperation.create({
    orderId: order.id,
    paymentId: payment.id,
    provider: payment.provider,
    liveMode: false,
    amountMinor: 1000,
    reason: 'requested_by_customer',
    idempotencyKey: randomUUID(),
    state: 'pending',
    needsReview: false,
    replayScope: 'resource',
    ...values,
  })
}

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
    const stageOf = async (qs = '') => {
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
      assert.equal(await stageOf(`?stage=${stage}`), stage)
    }
    assert.equal(await stageOf('?stage=bogus'), 'to_pack')
    assert.equal(await stageOf('?stage='), 'to_pack')
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

  test('keeps the staff order queue closed to guests and customers', async ({ client }) => {
    const customer = await UserFactory.merge({ role: 'customer' }).create()

    const guest = await client.get('/seller/orders').redirects(0)
    guest.assertStatus(302)
    guest.assertHeader('location', '/login')

    const denied = await client.get('/seller/orders').loginAs(customer).accept('json')
    denied.assertStatus(403)
  })
})

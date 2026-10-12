import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import type User from '#models/account/user'
import OrderMessage from '#models/chat/order_message'
import ProductReview, { type ReviewStatus } from '#models/catalog/product_review'
import type Order from '#models/checkout/order'
import Shipment from '#models/checkout/shipment'
import Attempt from '#models/payments/attempt'
import Payment from '#models/payments/payment'
import RefundOperation from '#models/payments/refund_operation'
import type { ShipmentState } from '#services/checkout/state_service'
import { OrderFactory } from '#database/factories/order_factory'
import { ProductFactory } from '#database/factories/product_factory'
import { ProductVariantFactory } from '#database/factories/product_variant_factory'
import { UserFactory } from '#database/factories/user_factory'

/** Whole seconds, so values survive the SQLite round trip unchanged. */
const ago = (values: { days?: number; hours?: number; minutes?: number }) =>
  DateTime.utc().minus(values).startOf('second')
const millis = (iso: string | null) => (iso ? DateTime.fromISO(iso).toMillis() : null)

const staffUser = () => UserFactory.merge({ role: 'staff' }).create()

/** Opens the dashboard as staff and returns the deferred `attention` prop. */
async function attention(client: any, staff: User) {
  const page = await client.get('/dashboard').loginAs(staff).withInertia()
  page.assertStatus(200)
  return page.inertiaProps.attention
}

/** An online order that has been paid and confirmed, with one shipment in the given state. */
async function onlineOrder(
  values: Partial<Order> = {},
  shipment: { state: ShipmentState; packingAt?: DateTime | null } | null = { state: 'pending' }
) {
  const order = await OrderFactory.merge({
    source: 'online',
    lifecycleState: 'confirmed',
    financialStatus: 'paid',
    paidAt: DateTime.utc(),
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
    provider: 'attention-test',
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
    provider: 'attention-test',
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

function customerMessage(order: Order, body: string, createdAt: DateTime, readAt?: DateTime) {
  return OrderMessage.create({
    publicId: randomUUID(),
    orderId: order.id,
    senderId: order.userId,
    senderRole: 'customer',
    senderName: 'Customer',
    body,
    createdAt,
    readAt: readAt ?? null,
  })
}

test.group('Dashboard attention', (group) => {
  // truncate() empties the tables when its cleanup runs after each test. A trigger refuses to
  // delete variants that still hold reservations, so release them first.
  group.each.setup(async () => {
    const truncate = await testUtils.db().truncate()
    return async () => {
      await db.from('product_variants').update({ inventory_reserved_quantity: 0 })
      await truncate()
    }
  })

  test('lists paid online and manual orders still to pack, oldest first', async ({
    client,
    assert,
  }) => {
    const staff = await staffUser()
    const buyer = await UserFactory.merge({ fullName: 'Pat Buyer' }).create()
    const online = await onlineOrder({
      userId: buyer.id,
      paidAt: ago({ days: 2 }),
      processedAt: ago({ days: 2 }),
    })
    const manual = await legacyOrder({
      email: 'walk-in@example.com',
      fulfillmentStatus: 'unfulfilled',
      processedAt: ago({ days: 5 }),
    })
    const partial = await legacyOrder({
      fulfillmentStatus: 'partial',
      processedAt: ago({ days: 1 }),
    })

    // None of these are waiting to be packed.
    await onlineOrder({}, { state: 'packing', packingAt: DateTime.utc() })
    await onlineOrder({ financialStatus: 'pending', paidAt: null })
    await onlineOrder({ lifecycleState: 'pending_payment' })
    await onlineOrder({ lifecycleState: 'cancelled' })
    await legacyOrder({ financialStatus: 'pending' })
    await legacyOrder({ cancelledAt: DateTime.utc() })
    await legacyOrder({ fulfillmentStatus: 'fulfilled' })

    const { toPack } = await attention(client, staff)
    assert.equal(toPack.count, 3)
    assert.deepEqual(
      toPack.items.map((item: { id: string }) => item.id),
      [manual.id, online.id, partial.id]
    )
    const [first, second] = toPack.items
    assert.equal(first.number, manual.number)
    assert.equal(first.customer, 'walk-in@example.com')
    assert.equal(millis(first.since), manual.processedAt.toMillis())
    assert.equal(second.customer, 'Pat Buyer')
    assert.equal(millis(second.since), online.paidAt!.toMillis())
  })

  test('lists packed online orders waiting for a carrier', async ({ client, assert }) => {
    const staff = await staffUser()
    const packedAt = ago({ hours: 4 })
    const packed = await onlineOrder({}, { state: 'packing', packingAt: packedAt })

    await onlineOrder({}, { state: 'pending' })
    await onlineOrder({}, { state: 'shipped' })
    // A manual order is not shipped through the guarded shipment workflow.
    const manual = await legacyOrder()
    await Shipment.create({ orderId: manual.id, state: 'packing', packingAt: DateTime.utc() })

    const { toShip, toPack } = await attention(client, staff)
    assert.equal(toShip.count, 1)
    assert.lengthOf(toShip.items, 1)
    assert.equal(toShip.items[0].id, packed.id)
    assert.equal(toShip.items[0].number, packed.number)
    assert.equal(toShip.items[0].customer, packed.email)
    assert.equal(millis(toShip.items[0].since), packedAt.toMillis())
    // A packed order has left the packing queue.
    assert.notInclude(
      toPack.items.map((item: { id: string }) => item.id),
      packed.id
    )
  })

  test('counts each order once when several payment problems overlap', async ({
    client,
    assert,
  }) => {
    const staff = await staffUser()

    // Matches the lifecycle, attempt, and unknown-refund rules at once but counts once.
    const overlapping = await onlineOrder({ lifecycleState: 'review_required' })
    await openAttempt(overlapping, { state: 'unknown', needsReview: true })
    await refund(overlapping, { state: 'unknown' })
    const flaggedAttempt = await onlineOrder()
    await openAttempt(flaggedAttempt, { state: 'failed', needsReview: true })
    const flaggedRefund = await onlineOrder()
    await refund(flaggedRefund, { state: 'pending', needsReview: true })

    // Healthy or already-settled payments need nobody.
    const settled = await onlineOrder()
    await openAttempt(settled, { state: 'paid', needsReview: true })
    await refund(await onlineOrder(), { state: 'pending', needsReview: false })
    await openAttempt(await onlineOrder(), { state: 'unknown', needsReview: false })

    const { paymentReview } = await attention(client, staff)
    assert.equal(paymentReview.count, 3)
    assert.sameMembers(
      paymentReview.items.map((item: { id: string }) => item.id),
      [overlapping.id, flaggedAttempt.id, flaggedRefund.id]
    )
  })

  test('reports unread customer messages per conversation, longest waiting first', async ({
    client,
    assert,
  }) => {
    const staff = await staffUser()
    const ana = await UserFactory.merge({ fullName: 'Ana Reyes' }).create()
    const ben = await UserFactory.merge({ fullName: 'Ben Cruz' }).create()
    const cara = await UserFactory.merge({ fullName: 'Cara Diaz' }).create()
    const dan = await UserFactory.merge({ fullName: 'Dan Lim' }).create()

    const waiting = await legacyOrder({ userId: ana.id })
    await customerMessage(waiting, 'Is it packed yet?', ago({ minutes: 30 }))
    const newestUnread = ago({ minutes: 10 })
    await customerMessage(waiting, 'Can you add a gift note?', newestUnread)
    await customerMessage(
      waiting,
      'Thanks for the earlier reply',
      ago({ hours: 5 }),
      ago({ hours: 4 })
    )
    await OrderMessage.create({
      publicId: randomUUID(),
      orderId: waiting.id,
      senderId: staff.id,
      senderRole: 'staff',
      senderName: 'Sam Staff',
      body: 'Looking into it',
      createdAt: ago({ minutes: 5 }),
    })

    const longest = await legacyOrder({ userId: ben.id })
    await customerMessage(longest, 'Where is my parcel?', ago({ hours: 3 }))

    // Staff-only and already-read conversations have nothing to open.
    const answered = await legacyOrder({ userId: cara.id })
    await OrderMessage.create({
      publicId: randomUUID(),
      orderId: answered.id,
      senderId: staff.id,
      senderRole: 'staff',
      senderName: 'Sam Staff',
      body: 'Your order shipped',
      createdAt: ago({ hours: 2 }),
    })
    const read = await legacyOrder({ userId: dan.id })
    await customerMessage(read, 'All good, thanks', ago({ hours: 2 }), ago({ hours: 1 }))

    const { unreadChats } = await attention(client, staff)
    assert.equal(unreadChats.count, 2)
    assert.deepEqual(
      unreadChats.items.map((item: { orderId: string }) => item.orderId),
      [longest.id, waiting.id]
    )
    const [first, second] = unreadChats.items
    assert.equal(first.number, longest.number)
    assert.equal(first.customer, 'Ben Cruz')
    assert.equal(first.unread, 1)
    assert.equal(first.preview, 'Where is my parcel?')
    assert.equal(second.customer, 'Ana Reyes')
    assert.equal(second.unread, 2)
    assert.equal(second.preview, 'Can you add a gift note?')
    assert.equal(millis(second.since), newestUnread.toMillis())
  })

  test('lists only pending reviews and tracked variants that have sold out', async ({
    client,
    assert,
  }) => {
    const staff = await staffUser()
    const product = await ProductFactory.apply('published').merge({ title: 'Canvas Tote' }).create()
    // Shoppers get one review per product, so each review has its own author.
    const author = (name: string) => UserFactory.merge({ fullName: name }).create()
    const review = async (
      status: ReviewStatus,
      createdAt: DateTime,
      rating = 4,
      name = 'Other'
    ) => {
      const writer = await author(name)
      return ProductReview.create({
        productId: product.id,
        userId: writer.id,
        rating,
        status,
        createdAt,
      })
    }
    const older = await review('pending', ago({ days: 3 }), 2, 'Rae Writer')
    const newer = await review('pending', ago({ days: 1 }), 5)
    await review('approved', ago({ days: 4 }))
    await review('hidden', ago({ days: 5 }))

    const variant = (productId: string, title: string, values = {}) =>
      ProductVariantFactory.merge({
        productId,
        title,
        options: { Size: title },
        ...values,
      }).create()
    const draft = await ProductFactory.merge({ status: 'draft' }).create()
    const archived = await ProductFactory.merge({ status: 'archived' }).create()
    const zero = await variant(product.id, 'Zero', { inventoryQuantity: 0 })
    const held = await variant(product.id, 'Held', {
      inventoryQuantity: 4,
      inventoryReservedQuantity: 4,
    })
    const hidden = await variant(product.id, 'Switched off', {
      inventoryQuantity: 0,
      availableForSale: false,
    })
    await variant(product.id, 'Untracked', { inventoryQuantity: null })
    await variant(product.id, 'Plenty', { inventoryQuantity: 9 })
    await variant(product.id, 'Last one', { inventoryQuantity: 4, inventoryReservedQuantity: 3 })
    await variant(draft.id, 'Draft', { inventoryQuantity: 0 })
    await variant(archived.id, 'Archived', { inventoryQuantity: 0 })

    const { pendingReviews, outOfStock } = await attention(client, staff)
    assert.equal(pendingReviews.count, 2)
    assert.deepEqual(
      pendingReviews.items.map((item: { id: string }) => item.id),
      [older.id, newer.id]
    )
    assert.equal(pendingReviews.items[0].product, 'Canvas Tote')
    assert.equal(pendingReviews.items[0].rating, 2)
    assert.equal(pendingReviews.items[0].customer, 'Rae Writer')

    assert.equal(outOfStock.count, 3)
    assert.sameMembers(
      outOfStock.items.map((item: { id: string }) => item.id),
      [zero.id, held.id, hidden.id]
    )
    for (const item of outOfStock.items) {
      assert.equal(item.productId, product.id)
      assert.equal(item.product, 'Canvas Tote')
    }
  })

  test('shows three examples but counts every match', async ({ client, assert }) => {
    const staff = await staffUser()
    const product = await ProductFactory.apply('published').create()
    const manual: Order[] = []
    for (let day = 5; day >= 1; day--) {
      manual.push(await legacyOrder({ processedAt: ago({ days: day }) }))
      const reviewer = await UserFactory.create()
      await ProductReview.create({
        productId: product.id,
        userId: reviewer.id,
        rating: 3,
        status: 'pending',
        createdAt: ago({ days: day }),
      })
      await ProductVariantFactory.merge({
        productId: product.id,
        options: { Size: `Size ${day}` },
        inventoryQuantity: 0,
      }).create()
    }

    const { toPack, pendingReviews, outOfStock } = await attention(client, staff)
    for (const queue of [toPack, pendingReviews, outOfStock]) {
      assert.equal(queue.count, 5)
      assert.lengthOf(queue.items, 3)
    }
    assert.deepEqual(
      toPack.items.map((item: { id: string }) => item.id),
      manual.slice(0, 3).map((order) => order.id)
    )
  })

  test('skips the attention queries when only the summary is reloaded', async ({
    client,
    assert,
  }) => {
    const staff = await staffUser()
    await legacyOrder()

    const partial = await client
      .get('/dashboard')
      .loginAs(staff)
      .withInertiaPartialReload('dashboard', ['summary'])
    partial.assertStatus(200)
    assert.property(partial.inertiaProps, 'summary')
    assert.notProperty(partial.inertiaProps, 'attention')

    const attentionOnly = await client
      .get('/dashboard')
      .loginAs(staff)
      .withInertiaPartialReload('dashboard', ['attention'])
    assert.notProperty(attentionOnly.inertiaProps, 'summary')
    assert.equal(attentionOnly.inertiaProps.attention.toPack.count, 1)
  })
})

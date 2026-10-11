import { randomUUID } from 'node:crypto'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import User from '#models/account/user'
import type Order from '#models/checkout/order'
import OrderMessage from '#models/chat/order_message'
import Shipment from '#models/checkout/shipment'
import { OrderFactory } from '#database/factories/order_factory'

function message(order: Order, sender: User, body: string, minutesAgo = 0) {
  return OrderMessage.create({
    publicId: randomUUID(),
    orderId: order.id,
    senderId: sender.id,
    senderRole: sender.id === order.userId ? 'customer' : 'staff',
    senderName: sender.fullName ?? sender.email,
    body,
    createdAt: DateTime.now().minus({ minutes: minutesAgo }),
  })
}

test.group('Order chat inbox', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  async function people() {
    const staff = await User.create({
      email: 'staff@example.com',
      fullName: 'Sam Staff',
      password: 'x',
      role: 'staff',
    })
    const customer = await User.create({
      email: 'buyer@example.com',
      fullName: 'Casey Customer',
      password: 'x',
      role: 'customer',
    })
    return { staff, customer }
  }

  test('customers cannot open the inbox', async ({ client }) => {
    const { customer } = await people()
    const response = await client.get('/inbox').loginAs(customer).redirects(0)
    response.assertStatus(403)
  })

  test('lists confirmed account orders, latest conversation first', async ({ client, assert }) => {
    const { staff, customer } = await people()
    const quiet = await OrderFactory.merge({
      userId: customer.id,
      lifecycleState: 'confirmed',
    }).create()
    const busy = await OrderFactory.merge({
      userId: customer.id,
      lifecycleState: 'confirmed',
    }).create()
    const cancelledWithHistory = await OrderFactory.merge({
      userId: customer.id,
      lifecycleState: 'cancelled',
    }).create()
    await OrderFactory.merge({ userId: customer.id, lifecycleState: 'pending_payment' }).create()
    await OrderFactory.merge({ lifecycleState: 'confirmed' }).create()
    await message(cancelledWithHistory, customer, 'About my refund', 30)
    await message(busy, staff, 'Packed and ready', 10)
    await message(busy, customer, 'Thanks! When does it ship?', 5)

    const page = await client.get('/inbox').loginAs(staff).withInertia()
    page.assertStatus(200)
    const threads = page.inertiaProps.threads as {
      orderId: number
      customerName: string
      unreadCount: number
      lastMessage: { body: string } | null
    }[]
    assert.deepEqual(
      threads.map((thread) => thread.orderId),
      [busy.id, cancelledWithHistory.id, quiet.id]
    )
    assert.equal(threads[0].customerName, 'Casey Customer')
    assert.equal(threads[0].lastMessage?.body, 'Thanks! When does it ship?')
    assert.equal(threads[0].unreadCount, 1)
    assert.isNull(threads[2].lastMessage)
    assert.isNull(page.inertiaProps.conversation)

    const unread = await client.get('/inbox').qs({ filter: 'unread' }).loginAs(staff).withInertia()
    assert.deepEqual(
      unread.inertiaProps.threads.map((thread: { orderId: number }) => thread.orderId),
      [busy.id, cancelledWithHistory.id]
    )
  })

  test('opening a thread loads it in order and marks the customer side read', async ({
    client,
    assert,
  }) => {
    const { staff, customer } = await people()
    const order = await OrderFactory.merge({
      userId: customer.id,
      lifecycleState: 'confirmed',
    }).create()
    await message(order, customer, 'Hello?', 2)
    await message(order, staff, 'Hi Casey', 1)
    await message(order, customer, 'Is it shipped?', 0)

    const page = await client.get('/inbox').qs({ order: order.id }).loginAs(staff).withInertia()
    const conversation = page.inertiaProps.conversation
    assert.equal(conversation.roomKey, `order:${order.id}`)
    assert.isTrue(conversation.canSend)
    assert.deepEqual(
      conversation.messages.map((entry: { body: string; senderRole: string }) => [
        entry.senderRole,
        entry.body,
      ]),
      [
        ['customer', 'Hello?'],
        ['staff', 'Hi Casey'],
        ['customer', 'Is it shipped?'],
      ]
    )
    const unread = await OrderMessage.query().whereNull('read_at').orderBy('id')
    assert.deepEqual(
      unread.map((entry) => entry.senderRole),
      ['staff']
    )
  })

  test('the account holder sees the thread on their order page; others do not', async ({
    client,
    assert,
  }) => {
    const { staff, customer } = await people()
    const order = await OrderFactory.merge({
      userId: customer.id,
      lifecycleState: 'confirmed',
      source: 'online',
      publicId: 'chat-order',
    }).create()
    await message(order, staff, 'Your order is packed', 0)

    const own = await client.get('/checkout/orders/chat-order').loginAs(customer).withInertia()
    own.assertStatus(200)
    assert.equal(own.inertiaProps.conversation.messages[0].body, 'Your order is packed')
    assert.isTrue(own.inertiaProps.conversation.canSend)
    const stored = await OrderMessage.firstOrFail()
    assert.isNotNull(stored.readAt)

    const pending = await OrderFactory.merge({
      userId: customer.id,
      lifecycleState: 'pending_payment',
      source: 'online',
      publicId: 'unpaid-order',
    }).create()
    const unpaid = await client.get('/checkout/orders/unpaid-order').loginAs(customer).withInertia()
    assert.isNull(unpaid.inertiaProps.conversation)
    assert.equal(pending.userId, customer.id)
  })

  test('threads report the fulfillment stage and order total', async ({ client, assert }) => {
    const { staff, customer } = await people()
    const states = ['pending', 'packing', 'shipped', 'delivered'] as const
    const expected = ['to_pack', 'to_ship', 'in_transit', 'delivered']
    const orders: Order[] = []
    for (const state of states) {
      const order = await OrderFactory.merge({
        userId: customer.id,
        lifecycleState: 'confirmed',
        source: 'online',
        totalMinor: 59900,
      }).create()
      await Shipment.create({ orderId: order.id, state })
      orders.push(order)
    }
    const cancelled = await OrderFactory.merge({
      userId: customer.id,
      lifecycleState: 'cancelled',
      source: 'online',
    }).create()
    await message(cancelled, customer, 'Please cancel it', 0)

    const page = await client.get('/inbox').loginAs(staff).withInertia()
    page.assertStatus(200)
    const threads = page.inertiaProps.threads as {
      orderId: number
      stage: string
      totalAmount: number
      currencyCode: string
    }[]
    const stageOf = (id: number) => threads.find((thread) => thread.orderId === id)?.stage
    assert.deepEqual(
      orders.map((order) => stageOf(order.id)),
      expected
    )
    assert.equal(stageOf(cancelled.id), 'cancelled')
    const sample = threads.find((thread) => thread.orderId === orders[0].id)!
    assert.equal(sample.currencyCode, 'PHP')
    assert.equal(Number(sample.totalAmount), 599)
  })

  test('openThread carries the linked order even when the list leaves it out', async ({
    client,
    assert,
  }) => {
    const { staff, customer } = await people()
    const cancelled = await OrderFactory.merge({
      userId: customer.id,
      lifecycleState: 'cancelled',
      source: 'online',
    }).create()
    const guest = await OrderFactory.merge({ lifecycleState: 'confirmed' }).create()

    const linked = await client
      .get('/inbox')
      .qs({ order: cancelled.id })
      .loginAs(staff)
      .withInertia()
    linked.assertStatus(200)
    assert.notInclude(
      linked.inertiaProps.threads.map((thread: { orderId: number }) => thread.orderId),
      cancelled.id
    )
    assert.equal(linked.inertiaProps.openThread.orderId, cancelled.id)
    assert.equal(linked.inertiaProps.openThread.stage, 'cancelled')
    assert.equal(linked.inertiaProps.conversation.roomKey, `order:${cancelled.id}`)

    const forGuest = await client.get('/inbox').qs({ order: guest.id }).loginAs(staff).withInertia()
    forGuest.assertStatus(200)
    assert.isNull(forGuest.inertiaProps.openThread)
    assert.isNull(forGuest.inertiaProps.conversation)

    const plain = await client.get('/inbox').loginAs(staff).withInertia()
    assert.isNull(plain.inertiaProps.openThread)
  })
})

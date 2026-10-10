import { randomUUID } from 'node:crypto'
import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import emitter from '@adonisjs/core/services/emitter'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { QueueManager } from '@adonisjs/queue'
import { DateTime } from 'luxon'
import { storeName } from '#config/mail'
import OrderMessagePosted from '#events/chat/order_message_posted'
import type User from '#models/account/user'
import OrderMessage from '#models/chat/order_message'
import StockReservation from '#models/checkout/stock_reservation'
import Attempt from '#models/payments/attempt'
import OrderChatService from '#services/chat/order_chat_service'
import CartService from '#services/checkout/cart_service'
import CheckoutService from '#services/checkout/checkout_service'
import QuoteService from '#services/checkout/quote_service'
import InventoryService from '#services/catalog/inventory_service'
import DispatcherService from '#services/payments/dispatcher_service'
import PaymentService from '#services/payments/payment_service'
import RecoveryService from '#services/payments/recovery_service'
import SettlementService from '#services/payments/settlement_service'
import FakePaymentAdapter from '#tests/helpers/fake_payment_adapter'
import { ProductVariantFactory } from '#database/factories/product_variant_factory'
import { UserFactory } from '#database/factories/user_factory'

/** Submits a one-item order and returns its payment session, captured but not yet settled. */
async function capturedOrder(adapter: FakePaymentAdapter, customer?: User) {
  const variant = await ProductVariantFactory.merge({
    priceAmount: 499,
    currencyCode: 'PHP',
    availableForSale: true,
    inventoryQuantity: 2,
  }).create()
  await variant.load('product')
  variant.product.status = 'active'
  variant.product.publishedAt = DateTime.utc()
  await variant.product.save()
  const token = randomUUID()
  const carts = await app.container.make(CartService)
  await carts.add(token, customer?.id, variant.id, 1)
  const quotes = await app.container.make(QuoteService)
  const quote = await quotes.quote((await carts.load(token))!)
  const checkout = await app.container.make(CheckoutService)
  const { order } = await checkout.submit(token, customer?.id, {
    email: customer?.email ?? 'guest@example.com',
    shipping: {
      firstName: 'Casey',
      lastName: 'Customer',
      phoneNumber: '09171234567',
      address1: '123 Sample Street',
      city: 'Quezon City',
      zoneCode: 'Metro Manila',
      postalCode: '1100',
      countryCode: 'PH',
    },
    submissionKey: quote.submissionKey,
    cartVersion: quote.cartVersion,
    quoteFingerprint: quote.fingerprint,
  })
  const attempt = await Attempt.findByOrFail('orderId', order.id)
  const recovery = await app.container.make(RecoveryService)
  await recovery.run(attempt.id)
  await attempt.refresh()
  const session = adapter.sessions.get(attempt.externalId!)!
  session.status = 'paid'
  session.payments = [
    { id: `captured-${order.id}`, amount: order.totalMinor!, currency: 'PHP', status: 'paid' },
  ]
  return { order, session }
}

test.group('Order chat thank-you', (group) => {
  let adapter: FakePaymentAdapter
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate()
    adapter = new FakePaymentAdapter()
    app.container.swap(PaymentService, () => new DispatcherService(adapter.provider, [adapter]))
    QueueManager.fake()
    return async () => {
      QueueManager.restore()
      app.container.restore(PaymentService)
      const inventory = await app.container.make(InventoryService)
      const held = await StockReservation.query().where('state', 'reserved')
      for (const orderId of new Set(held.map((row) => row.orderId)))
        await db.transaction((trx) => inventory.release(trx, orderId))
      await cleanup()
    }
  })

  test('a paid account order gets one thank-you from the store in its chat', async ({ assert }) => {
    using events = emitter.fake([OrderMessagePosted])
    const customer = await UserFactory.merge({
      firstName: 'Casey',
      fullName: 'Casey Cruz',
    }).create()
    const { order, session } = await capturedOrder(adapter, customer)
    const settlement = await app.container.make(SettlementService)
    await settlement.apply(session)
    await settlement.apply(session)

    await order.refresh()
    assert.equal(order.lifecycleState, 'confirmed')
    const messages = await OrderMessage.query().where('order_id', order.id)
    assert.lengthOf(messages, 1)
    const [thanks] = messages
    assert.isNull(thanks.senderId)
    assert.equal(thanks.senderRole, 'staff')
    assert.equal(thanks.senderName, storeName)
    assert.isNull(thanks.readAt)
    assert.include(thanks.body, 'Thanks for ordering, Casey!')
    assert.include(thanks.body, order.number)
    events.assertEmittedCount(OrderMessagePosted, 1)

    // A repeated call, such as a duplicate event, leaves the thread alone.
    const chat = await app.container.make(OrderChatService)
    assert.isNull(await chat.thankForOrder(order))
    assert.lengthOf(await OrderMessage.query().where('order_id', order.id), 1)
  })

  test('the customer sees the thank-you on their order page', async ({ client, assert }) => {
    const customer = await UserFactory.merge({ firstName: 'Casey' }).create()
    const { order, session } = await capturedOrder(adapter, customer)
    const settlement = await app.container.make(SettlementService)
    await settlement.apply(session)

    const page = await client
      .get(`/checkout/orders/${order.publicId}`)
      .loginAs(customer)
      .withInertia()
    page.assertStatus(200)
    const messages = page.inertiaProps.conversation.messages as {
      senderName: string
      senderRole: string
      body: string
    }[]
    assert.lengthOf(messages, 1)
    assert.equal(messages[0].senderName, storeName)
    assert.equal(messages[0].senderRole, 'staff')
    assert.include(messages[0].body, 'Thanks for ordering, Casey!')
  })

  test('guest orders have no chat, so nothing is posted', async ({ assert }) => {
    const { order, session } = await capturedOrder(adapter)
    const settlement = await app.container.make(SettlementService)
    await settlement.apply(session)

    await order.refresh()
    assert.equal(order.lifecycleState, 'confirmed')
    assert.isEmpty(await OrderMessage.all())
  })

  test('a failed thank-you never reverses the payment', async ({ assert, cleanup }) => {
    app.container.swap(
      OrderChatService,
      () =>
        new (class extends OrderChatService {
          async thankForOrder(): Promise<null> {
            throw new Error('Chat unavailable')
          }
        })()
    )
    cleanup(() => app.container.restore(OrderChatService))
    const customer = await UserFactory.create()
    const { order, session } = await capturedOrder(adapter, customer)
    const settlement = await app.container.make(SettlementService)
    await settlement.apply(session)

    await order.refresh()
    assert.equal(order.lifecycleState, 'confirmed')
    assert.equal(order.financialStatus, 'paid')
    assert.isEmpty(await OrderMessage.all())
  })
})

import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { QueueManager } from '@adonisjs/queue'
import paymentConfig from '#config/payment'
import PaymentProvider from '#providers/payment_provider'
import PaymentService from '#services/payments/payment_service'
import FakePayMongoService from '#providers/payments/fake_paymongo_service'
import DispatcherService from '#services/payments/dispatcher_service'
import FakePaymentAdapter from '#tests/helpers/fake_payment_adapter'
import RecoveryService from '#services/payments/recovery_service'
import FulfillmentService from '#services/checkout/fulfillment_service'
import RefundService from '#services/payments/refund_service'
import InventoryService from '#services/catalog/inventory_service'
import Payment from '#models/payments/payment'
import Notification from '#models/checkout/notification'
import RefundOperation from '#models/payments/refund_operation'
import Shipment from '#models/checkout/shipment'
import { simulatedCheckout } from '#tests/helpers/simulated_checkout'
import { UserFactory } from '#database/factories/user_factory'
import { urlFor } from '@adonisjs/core/services/url_builder'

test.group('Development payment simulator', (group) => {
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate()
    const original = paymentConfig.defaultProvider
    paymentConfig.defaultProvider = 'fake_paymongo'
    QueueManager.fake()
    return async () => {
      QueueManager.restore()
      paymentConfig.defaultProvider = original
      const inventory = await app.container.make(InventoryService)
      const held = await db.from('stock_reservations').where('state', 'reserved')
      for (const id of new Set(held.map((row) => row.order_id)))
        await db.transaction((trx) => inventory.release(trx, id))
      await cleanup()
    }
  })

  test('uses the DI adapter, persists checkout replay across instances, and rejects a changed key payload', async ({
    assert,
  }) => {
    const { attempt } = await simulatedCheckout()
    const payments = await app.container.make(PaymentService)
    assert.equal(payments.getProvider().provider, 'fake_paymongo')
    assert.isFalse(payments.getProvider().liveMode)
    const restarted = new FakePayMongoService()
    const replay = await restarted.createCheckout(attempt.requestSnapshot)
    assert.equal(replay.id, attempt.externalId)
    assert.equal(replay.url, attempt.checkoutUrl)
    assert.include(new URL(replay.url).pathname, '/_dev/paymongo/checkouts/')
    await assert.rejects(
      () =>
        restarted.createCheckout({
          ...attempt.requestSnapshot,
          reference: 'different-order',
        }),
      'Idempotency key already used with different input'
    )
    assert.lengthOf(await db.from('dev_payment_resources'), 1)
  })

  test('successful and repeated simulator submissions settle stock once and permit shipping', async ({
    assert,
    client,
    route,
  }) => {
    const { order, attempt, variant } = await simulatedCheckout()
    const path = new URL(attempt.checkoutUrl!).pathname
    const page = await client.get(path).withInertia()
    page.assertStatus(200)
    page.assertInertiaComponent('payments/simulation')
    page.assertHeader('cache-control', 'private, no-store')
    assert.equal(page.inertiaProps.simulation.amountMinor, 59900)
    assert.notProperty(page.inertiaProps.simulation, 'customer')
    assert.notProperty(page.inertiaProps.simulation, 'idempotencyKey')
    for (let repeat = 0; repeat < 2; repeat++) {
      const paid = await client.post(path).withCsrfToken().form({ outcome: 'paid' }).redirects(0)
      paid.assertStatus(302)
      paid.assertHeader('location', route('checkout.orders.show', { publicId: order.publicId! }))
    }
    await order.refresh()
    await variant.refresh()
    assert.equal(order.lifecycleState, 'confirmed')
    assert.equal(order.financialStatus, 'paid')
    assert.equal(variant.inventoryQuantity, 1)
    assert.equal(variant.inventoryReservedQuantity, 0)
    assert.lengthOf(await Payment.all(), 1)
    assert.lengthOf(await Notification.all(), 1)
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    const fulfillment = await app.container.make(FulfillmentService)
    await fulfillment.pack(order.id, staff)
    await fulfillment.ship(order.id, staff, { carrier: 'Dev Carrier', trackingNumber: 'SIM-123' })
    const shipment = await Shipment.findByOrFail('orderId', order.id)
    assert.equal(shipment.state, 'shipped')
  })

  test('failure retains the hold and a subsequent success captures the original exact amount', async ({
    assert,
    client,
  }) => {
    const { order, attempt, variant } = await simulatedCheckout()
    const path = new URL(attempt.checkoutUrl!).pathname
    const failed = await client.post(path).withCsrfToken().form({ outcome: 'failed' }).redirects(0)
    failed.assertStatus(302)
    failed.assertHeader('location', path)
    const page = await client.get(path).withInertia()
    assert.isTrue(page.inertiaProps.simulation.failed)
    await order.refresh()
    await variant.refresh()
    assert.equal(order.lifecycleState, 'pending_payment')
    assert.equal(variant.inventoryReservedQuantity, 1)
    assert.isEmpty(await Payment.all())
    await client.post(path).withCsrfToken().form({ outcome: 'paid' }).redirects(0)
    const payment = await Payment.firstOrFail()
    assert.equal(payment.amountMinor, 59900)
  })

  test('expiry releases the stock hold and cannot subsequently capture a payment', async ({
    assert,
    client,
  }) => {
    const { order, attempt, variant } = await simulatedCheckout()
    const path = new URL(attempt.checkoutUrl!).pathname
    const expired = await client
      .post(path)
      .withCsrfToken()
      .form({ outcome: 'expired' })
      .redirects(0)
    expired.assertStatus(302)
    await order.refresh()
    await variant.refresh()
    assert.equal(order.lifecycleState, 'expired')
    assert.equal(variant.inventoryQuantity, 2)
    assert.equal(variant.inventoryReservedQuantity, 0)
    await client.post(path).withCsrfToken().form({ outcome: 'paid' }).redirects(0)
    assert.isEmpty(await Payment.all())
  })

  test('guest cancellation expires the fake session through normal recovery', async ({
    assert,
  }) => {
    const { order, attempt, variant } = await simulatedCheckout()
    const recovery = await app.container.make(RecoveryService)
    await recovery.requestCancel(order.id)
    await recovery.run(attempt.id)
    await order.refresh()
    await variant.refresh()
    const payments = await app.container.make(PaymentService)
    const session = await payments.getCheckout({
      provider: attempt.provider,
      id: attempt.externalId!,
    })
    assert.equal(session.status, 'expired')
    assert.equal(order.lifecycleState, 'cancelled')
    assert.equal(variant.inventoryReservedQuantity, 0)
  })

  test('a missed payment notification is recovered from persistent provider lookup', async ({
    assert,
    client,
  }) => {
    const { order, attempt } = await simulatedCheckout()
    const path = new URL(attempt.checkoutUrl!).pathname
    await client
      .post(path)
      .withCsrfToken()
      .form({ outcome: 'paid_without_notification' })
      .redirects(0)
    await order.refresh()
    assert.equal(order.lifecycleState, 'pending_payment')
    assert.isEmpty(await Payment.all())
    const recovery = await app.container.make(RecoveryService)
    await recovery.run(attempt.id)
    await order.refresh()
    assert.equal(order.lifecycleState, 'confirmed')
    assert.lengthOf(await Payment.all(), 1)
  })

  test('paid cancellation confirms a replayable fake refund through the normal refund workflow', async ({
    assert,
    client,
  }) => {
    const { order, attempt, variant } = await simulatedCheckout()
    await client
      .post(new URL(attempt.checkoutUrl!).pathname)
      .withCsrfToken()
      .form({ outcome: 'paid' })
      .redirects(0)
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    const fulfillment = await app.container.make(FulfillmentService)
    await fulfillment.cancel(order.id, staff)
    const operation = await RefundOperation.findByOrFail('orderId', order.id)
    const refunds = await app.container.make(RefundService)
    await refunds.run(operation.id)
    await refunds.run(operation.id)
    await order.refresh()
    await variant.refresh()
    await operation.refresh()
    assert.equal(order.lifecycleState, 'cancelled')
    assert.equal(order.financialStatus, 'refunded')
    assert.equal(operation.state, 'succeeded')
    assert.equal(variant.inventoryQuantity, 2)
    const payment = await Payment.findOrFail(operation.paymentId)
    const restarted = new FakePayMongoService()
    const replay = await restarted.refund({
      paymentId: payment.externalId,
      amount: operation.amountMinor,
      currency: payment.currency,
      reason: operation.reason,
      idempotencyKey: operation.idempotencyKey,
    })
    assert.equal(replay.id, operation.externalId)
    assert.deepEqual(await restarted.getRefund(replay.id), replay)
    await assert.rejects(
      () =>
        restarted.refund({
          paymentId: payment.externalId,
          amount: 100,
          currency: 'PHP',
          reason: 'duplicate',
          idempotencyKey: 'over-refund',
        }),
      'Refund exceeds the captured balance'
    )
    assert.lengthOf(await db.from('dev_payment_resources').where('kind', 'refund'), 1)
  })

  test('rejects invalid mutations, unknown resources, and unauthenticated fake webhooks', async ({
    client,
    route,
  }) => {
    const { attempt } = await simulatedCheckout()
    const path = new URL(attempt.checkoutUrl!).pathname
    const invalid = await client
      .post(path)
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({ outcome: 'wrong' })
    invalid.assertStatus(422)
    const unknown = await client
      .get(route('payments.simulations.show', { id: 'unknown' }))
      .withInertia()
    unknown.assertStatus(404)
    const webhook = await client
      .post(urlFor('payments.webhooks.store', { provider: 'fake_paymongo' }))
      .json({ type: 'checkout.paid' })
    webhook.assertStatus(404)
  })

  test('switching the default preserves saved fake checkout controls, reconciliation and refunds', async ({
    assert,
    client,
  }) => {
    const { order, attempt } = await simulatedCheckout()
    paymentConfig.defaultProvider = 'paymongo'
    const next = new FakePaymentAdapter('paymongo')
    app.container.swap(
      PaymentService,
      () => new DispatcherService(next.provider, [new FakePayMongoService(), next])
    )
    try {
      const payments = await app.container.make(PaymentService)
      assert.equal(payments.getProvider().provider, 'paymongo')
      const reference = { provider: attempt.provider, id: attempt.externalId! }
      const savedCheckout = await payments.getCheckout(reference)
      assert.equal(savedCheckout.id, attempt.externalId)
      const path = new URL(attempt.checkoutUrl!).pathname
      const page = await client.get(path).withInertia()
      page.assertStatus(200)
      const paid = await client.post(path).withCsrfToken().form({ outcome: 'paid' }).redirects(0)
      paid.assertStatus(302)
      await order.refresh()
      assert.equal(order.lifecycleState, 'confirmed')
      const staff = await UserFactory.merge({ role: 'staff' }).create()
      const refunds = await app.container.make(RefundService)
      const operation = await refunds.requestFull(order.id, staff)
      await refunds.run(operation.id)
      await operation.refresh()
      assert.equal(operation.state, 'succeeded')
      const savedRefund = await payments.getRefund({
        provider: operation.provider,
        id: operation.externalId!,
      })
      assert.equal(savedRefund.status, 'succeeded')
      assert.isEmpty(next.calls)
    } finally {
      app.container.restore(PaymentService)
    }
  })

  test('refuses to boot a production app configured for the simulator', async ({ assert }) => {
    const productionApp = { inProduction: true, config: app.config } as typeof app
    await assert.rejects(
      () => new PaymentProvider(productionApp).boot(),
      'fake_paymongo is only available in development and tests'
    )
  })
})

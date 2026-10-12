import { randomUUID } from 'node:crypto'
import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import CartService from '#services/checkout/cart_service'
import QuoteService from '#services/checkout/quote_service'
import CheckoutService from '#services/checkout/checkout_service'
import OrderAccessService from '#services/checkout/order_access_service'
import RecoveryService from '#services/payments/recovery_service'
import SettlementService from '#services/payments/settlement_service'
import InventoryService from '#services/catalog/inventory_service'
import PaymentService from '#services/payments/payment_service'
import DispatcherService from '#services/payments/dispatcher_service'
import FakePaymentAdapter from '#tests/helpers/fake_payment_adapter'
import Attempt from '#models/payments/attempt'
import Order from '#models/checkout/order'
import Cart from '#models/checkout/cart'
import Payment from '#models/payments/payment'
import StockReservation from '#models/checkout/stock_reservation'
import Notification from '#models/checkout/notification'
import FulfillmentService from '#services/checkout/fulfillment_service'
import RefundService from '#services/payments/refund_service'
import NotificationService from '#services/checkout/notification_service'
import OutboxPublisherService from '#services/checkout/outbox_publisher_service'
import Shipment from '#models/checkout/shipment'
import RefundObservation from '#models/payments/refund_observation'
import RefundLookupService from '#services/payments/refund_lookup_service'
import SimulationService from '#services/payments/simulation_service'
import AuditService from '#services/checkout/audit_service'
import PublishWorkflowOutbox from '#jobs/checkout/publish_workflow_outbox'
import { UserFactory } from '#database/factories/user_factory'
import { QueueManager, Worker } from '@adonisjs/queue'
import OrderNotification from '#mails/checkout/order_notification'
import mail from '@adonisjs/mail/services/main'
import WorkflowOutbox from '#models/checkout/workflow_outbox'
import { ProductVariantFactory } from '#database/factories/product_variant_factory'
import { DateTime } from 'luxon'
import checkoutConfig from '#config/checkout'

const shipping = {
  firstName: 'Guest',
  lastName: 'Customer',
  phoneNumber: '09171234567',
  address1: '123 Sample Street',
  city: 'Quezon City',
  zoneCode: 'Metro Manila',
  postalCode: '1100',
  countryCode: 'PH' as const,
}

async function submission() {
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
  await carts.add(token, undefined, variant.id, 2)
  const cart = (await carts.load(token))!
  const quoteService1 = await app.container.make(QuoteService)
  const quote = await quoteService1.quote(cart)
  const input = {
    email: 'guest@example.com',
    shipping,
    submissionKey: quote.submissionKey,
    cartVersion: quote.cartVersion,
    quoteFingerprint: quote.fingerprint,
  }
  return { variant, token, quote, input, checkout: await app.container.make(CheckoutService) }
}

async function capturedSubmission(adapter: FakePaymentAdapter) {
  const fixture = await submission()
  const { order } = await fixture.checkout.submit(fixture.token, undefined, fixture.input)
  const attempt = await Attempt.findByOrFail('orderId', order.id)
  const recoveryService2 = await app.container.make(RecoveryService)
  await recoveryService2.run(attempt.id)
  await attempt.refresh()
  const session = adapter.sessions.get(attempt.externalId!)!
  session.status = 'paid'
  session.payments = [{ id: 'captured-fixture', amount: 109800, currency: 'PHP', status: 'paid' }]
  const settlementService3 = await app.container.make(SettlementService)
  await settlementService3.apply(session)
  return { ...fixture, order, attempt, session }
}

function databaseWorker() {
  const adapter = QueueManager.use('database')
  return new Worker({
    default: 'database',
    adapters: { database: () => adapter },
    autoLoadJobs: false,
    jobFactory: async (JobClass) => app.container.make(JobClass),
    worker: {
      concurrency: 1,
      idleDelay: 10,
      stalledThreshold: 1000,
      stalledInterval: 10,
      maxStalledCount: 1,
      gracefulShutdown: false,
    },
  })
}

test.group('Online checkout workflow', (group) => {
  let adapter: FakePaymentAdapter
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate()
    adapter = new FakePaymentAdapter()
    app.container.swap(PaymentService, () => new DispatcherService(adapter.provider, [adapter]))
    return async () => {
      app.container.restore(PaymentService)
      const inventory = await app.container.make(InventoryService)
      const loadedStockReservation4 = await StockReservation.query().where('state', 'reserved')
      for (const orderId of new Set(loadedStockReservation4.map((row) => row.orderId)))
        await db.transaction((trx) => inventory.release(trx, orderId))
      await cleanup()
    }
  })

  test('freezes one guest order with exact totals, private access and idempotent submission', async ({
    assert,
  }) => {
    const { checkout, token, input, variant } = await submission()
    const first = await checkout.submit(token, undefined, input)
    const again = await checkout.submit(token, undefined, input)
    assert.equal(first.order.id, again.order.id)
    assert.equal(first.order.totalMinor, 109800)
    assert.equal(first.order.shippingMinor, 10000)
    assert.lengthOf(await Order.all(), 1)
    assert.lengthOf(await Attempt.all(), 1)
    const attempt = await Attempt.findByOrFail('orderId', first.order.id)
    const orderUrl = `${new URL(checkoutConfig.publicUrl!).origin}/checkout/orders/${first.order.publicId}`
    assert.equal(attempt.requestSnapshot.successUrl, orderUrl)
    assert.equal(attempt.requestSnapshot.cancelUrl, orderUrl)
    assert.lengthOf(await WorkflowOutbox.all(), 2)
    assert.isEmpty(adapter.calls)
    await variant.refresh()
    assert.equal(variant.inventoryReservedQuantity, 2)
    const access = await app.container.make(OrderAccessService)
    assert.isTrue(await access.canAccess(first.order, undefined, first.token))
    assert.isFalse(await access.canAccess(first.order, 999, 'wrong'))
    await assert.rejects(() =>
      checkout.submit(token, undefined, { ...input, email: 'changed@example.com' })
    )
  })

  test('rolls back stale quotes without leaving an order, frozen cart or stock holds', async ({
    assert,
  }) => {
    const { checkout, token, input, variant } = await submission()
    variant.priceAmount = 500
    await variant.save()
    await assert.rejects(
      () => checkout.submit(token, undefined, input),
      'Prices or availability changed. Review the updated quote.'
    )
    assert.isEmpty(await Order.all())
    assert.isEmpty(await StockReservation.all())
    assert.isEmpty(await WorkflowOutbox.all())
    const cartService5 = await app.container.make(CartService)
    assert.isNotNull(await cartService5.load(token))
  })

  test('guest HTTP checkout rotates the cart, protects every private action and permits capability-backed account claiming', async ({
    assert,
    client,
  }) => {
    using queue = QueueManager.fake()
    const { token, input } = await submission()
    const submitted = await client
      .post('/checkout')
      .withSession({ store_cart_token: token })
      .withCsrfToken()
      .form(input)
      .redirects(0)
    submitted.assertStatus(302)
    const order = await Order.firstOrFail()
    submitted.assertHeader('location', `/checkout/orders/${order.publicId}`)
    const orderAccessService10 = await app.container.make(OrderAccessService)
    const grant = await orderAccessService10.issue(order.id)
    const ownedSession = { store_order_grants: { [order.publicId!]: grant } }
    const outsider = await UserFactory.create()
    for (const path of ['', '/cancel', '/reconcile']) {
      const denied = path
        ? await client
            .post(`/checkout/orders/${order.publicId}${path}`)
            .loginAs(outsider)
            .withCsrfToken()
        : await client.get(`/checkout/orders/${order.publicId}`).loginAs(outsider).withInertia()
      denied.assertStatus(404)
    }
    const status = await client
      .get(`/checkout/orders/${order.publicId}`)
      .withSession(ownedSession)
      .withInertia()
    status.assertStatus(200)
    status.assertInertiaComponent('checkout/order')
    assert.equal(status.inertiaProps.status.amountMinor, 109800)
    assert.notProperty(status.inertiaProps.status, 'token')
    const customer = await UserFactory.create()
    const claim = await client
      .post(`/checkout/orders/${order.publicId}/claim`)
      .loginAs(customer)
      .withSession(ownedSession)
      .withCsrfToken()
      .redirects(0)
    claim.assertStatus(302)
    await order.refresh()
    assert.equal(order.userId, customer.id)
    const stolen = await client
      .post(`/checkout/orders/${order.publicId}/claim`)
      .loginAs(outsider)
      .withSession(ownedSession)
      .withCsrfToken()
    stolen.assertStatus(409)
    const account = await client.get(`/account/orders/${order.id}`).loginAs(customer).redirects(0)
    account.assertHeader('location', `/checkout/orders/${order.publicId}`)
    queue.assertPushedCount(2)
  })

  test('only paid orders can pack and ship; shipment and receipt jobs are idempotent', async ({
    assert,
  }) => {
    using fakeMail = mail.fake()
    const { checkout, token, input, variant } = await submission()
    const { order } = await checkout.submit(token, undefined, input)
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    const customer = await UserFactory.create()
    const fulfillment = await app.container.make(FulfillmentService)
    await assert.rejects(() => fulfillment.pack(order.id, staff))
    const attempt = await Attempt.findByOrFail('orderId', order.id)
    const recoveryService11 = await app.container.make(RecoveryService)
    await recoveryService11.run(attempt.id)
    await attempt.refresh()
    const session = adapter.sessions.get(attempt.externalId!)!
    session.status = 'paid'
    session.payments = [{ id: 'captured', amount: 109800, currency: 'PHP', status: 'paid' }]
    const settlementService12 = await app.container.make(SettlementService)
    await settlementService12.apply(session)
    await assert.rejects(() => fulfillment.pack(order.id, customer))
    await fulfillment.pack(order.id, staff)
    await fulfillment.pack(order.id, staff)
    const details = {
      carrier: 'Sample Carrier',
      trackingNumber: 'TRACK-123',
      trackingUrl: 'https://carrier.example/track/123',
    }
    await fulfillment.ship(order.id, staff, details)
    await fulfillment.ship(order.id, staff, details)
    await assert.rejects(() => fulfillment.cancel(order.id, staff))
    assert.lengthOf(await Shipment.all(), 1)
    assert.lengthOf(await Notification.all(), 2)
    const notifications = await app.container.make(NotificationService)
    for (const notification of await Notification.all()) {
      await notifications.run(notification.id)
      await notifications.run(notification.id)
    }
    fakeMail.mails.assertSentCount(2)
    fakeMail.mails.assertSent(OrderNotification, ({ message }) => {
      message.assertHtmlIncludes(
        `${new URL(checkoutConfig.publicUrl!).origin}/checkout/orders/${order.publicId}/access?token=`
      )
      return message.hasTo('guest@example.com')
    })
    const email = new OrderNotification(
      await Order.findOrFail(order.id),
      'receipt',
      'https://store.example/private',
      null,
      1
    )
    await email.buildWithContents()
    email.message.assertContent('html', '₱1,098.00')
    await variant.refresh()
    assert.equal(variant.inventoryQuantity, 0)
  })

  test('the real database queue recovers a stalled worker and ignores delayed expiry after payment', async ({
    assert,
    cleanup,
  }) => {
    const { checkout, token, input, variant } = await submission()
    const { order } = await checkout.submit(token, undefined, input)
    const attempt = await Attempt.findByOrFail('orderId', order.id)
    const outboxPublisherService19 = await app.container.make(OutboxPublisherService)
    await outboxPublisherService19.publish()
    const databaseAdapter = QueueManager.use('database')
    const acquired = await databaseAdapter.popFrom('payments')
    assert.isNotNull(acquired)
    await db.from('queue_jobs').where('id', acquired!.id).update({ acquired_at: 0 })
    const worker = new Worker({
      default: 'database',
      adapters: { database: () => databaseAdapter },
      autoLoadJobs: false,
      jobFactory: async (JobClass) => app.container.make(JobClass),
      worker: {
        concurrency: 1,
        idleDelay: 10,
        stalledThreshold: 1000,
        stalledInterval: 10,
        maxStalledCount: 1,
        gracefulShutdown: false,
      },
    })
    cleanup(() => worker.stop())
    const loadedworker20 = await worker.processCycle(['payments'])
    assert.equal(loadedworker20?.type, 'started')
    const loadedworker21 = await worker.processCycle(['payments'])
    assert.equal(loadedworker21?.type, 'completed')
    await attempt.refresh()
    assert.equal(attempt.state, 'pending')
    assert.equal(adapter.sessions.size, 1)
    const session = adapter.sessions.get(attempt.externalId!)!
    session.status = 'paid'
    session.payments = [{ id: 'worker-payment', amount: 109800, currency: 'PHP', status: 'paid' }]
    const settlementService22 = await app.container.make(SettlementService)
    await settlementService22.apply(session)
    await db.from('queue_jobs').where('status', 'delayed').update({ execute_at: 0 })
    const loadedworker23 = await worker.processCycle(['payments'])
    assert.equal(loadedworker23?.type, 'started')
    const loadedworker24 = await worker.processCycle(['payments'])
    assert.equal(loadedworker24?.type, 'completed')
    await order.refresh()
    await variant.refresh()
    assert.equal(order.lifecycleState, 'confirmed')
    assert.equal(variant.inventoryQuantity, 0)
    assert.equal(adapter.calls.length, 1)
  })

  test('competing cart submissions produce one frozen order and never over-reserve stock', async ({
    assert,
  }) => {
    const { checkout, token, input, variant } = await submission()
    const results = await Promise.allSettled([
      checkout.submit(token, undefined, input),
      checkout.submit(token, undefined, input),
    ])
    assert.isTrue(results.some((result) => result.status === 'fulfilled'))
    assert.lengthOf(await Order.all(), 1)
    assert.lengthOf(await Attempt.all(), 1)
    await variant.refresh()
    assert.equal(variant.inventoryReservedQuantity, 2)
    const replay = await checkout.submit(token, undefined, input)
    const loadedOrder25 = await Order.firstOrFail()
    assert.equal(replay.order.id, loadedOrder25.id)
  })

  test('existing active carts receive a stable submission key without replacing their lines', async ({
    assert,
  }) => {
    const { token } = await submission()
    const cart = await Cart.findByOrFail('token', token)
    cart.submissionKey = null
    await cart.save()
    const carts = await app.container.make(CartService)
    const first = await carts.findOrCreate(token)
    const second = await carts.findOrCreate(token)
    assert.isString(first.submissionKey)
    assert.equal(first.submissionKey, second.submissionKey)
    const quoteService = await app.container.make(QuoteService)
    const quote = await quoteService.quote(second)
    assert.lengthOf(quote.lines, 1)
    assert.equal(quote.totalMinor, 109800)
  })

  test('the simulation workflow reads and reconciles through the unified payment interface', async ({
    assert,
  }) => {
    const { checkout, token, input, variant } = await submission()
    const { order } = await checkout.submit(token, undefined, input)
    const attempt = await Attempt.findByOrFail('orderId', order.id)
    const recovery = await app.container.make(RecoveryService)
    await recovery.run(attempt.id)
    await attempt.refresh()
    const reference = { provider: adapter.provider, id: attempt.externalId! }
    const simulations = await app.container.make(SimulationService)
    const view = await simulations.show(reference)
    assert.equal(view.reference, order.publicId)
    assert.equal(view.amountMinor, 109800)
    const session = adapter.sessions.get(reference.id)!
    session.status = 'paid'
    session.payments = [
      { id: 'simulation-capture', amount: 109800, currency: 'PHP', status: 'paid' },
    ]
    await simulations.update(reference)
    await simulations.update(reference)
    await order.refresh()
    await variant.refresh()
    assert.equal(order.lifecycleState, 'confirmed')
    assert.equal(variant.inventoryQuantity, 0)
    assert.lengthOf(await Payment.all(), 1)
  })

  test('a concurrent stale failure cannot undo refund success or allow a second full refund', async ({
    assert,
  }) => {
    const { order } = await capturedSubmission(adapter)
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    const refunds = await app.container.make(RefundService)
    const operation = await refunds.requestFull(order.id, staff)
    await refunds.run(operation.id)
    await operation.refresh()
    const remote = adapter.refunds.get(operation.externalId!)!
    // Start both events together; their observation and balance transactions serialize.
    await Promise.all([
      refunds.apply({ ...remote, status: 'failed' }),
      refunds.apply({ ...remote, status: 'succeeded' }),
    ])
    await refunds.apply({ ...remote, status: 'failed' })
    const observation = await RefundObservation.findByOrFail('externalId', remote.id)
    await operation.refresh()
    await order.refresh()
    assert.equal(observation.state, 'succeeded')
    assert.equal(operation.state, 'succeeded')
    assert.equal(order.financialStatus, 'refunded')
    await assert.rejects(
      () => refunds.requestFull(order.id, staff),
      'This payment is already refunded'
    )
    assert.lengthOf(await order.related('refunds').query(), 1)
  })

  for (const earlierStatus of ['pending', 'failed'] as const) {
    test(`a sparse refund update received during a ${earlierStatus} lookup is fetched by its queued job`, async ({
      assert,
    }) => {
      const { order } = await capturedSubmission(adapter)
      const reference = { provider: adapter.provider, id: 'lookup-race-refund' }
      adapter.refunds.set(reference.id, {
        ...reference,
        paymentId: 'captured-fixture',
        amount: 109800,
        currency: 'PHP',
        status: earlierStatus,
        liveMode: false,
      })
      const lookups = await app.container.make(RefundLookupService)
      const row = await lookups.request(reference, false, 'first-event')
      let signalFetched!: () => void
      const fetched = new Promise<void>((resolve) => {
        signalFetched = resolve
      })
      let releaseResponse!: () => void
      const responseReady = new Promise<void>((resolve) => {
        releaseResponse = resolve
      })
      const original = adapter.getRefund.bind(adapter)
      adapter.getRefund = async (id) => {
        const response = await original(id)
        signalFetched()
        await responseReady
        return response
      }
      const firstLookup = lookups.run(row.id)
      try {
        await fetched
        adapter.refunds.get(reference.id)!.status = 'succeeded'
        await lookups.request(reference, false, 'second-event')
        releaseResponse()
        await firstLookup
        adapter.getRefund = original
        await lookups.run(row.id)
        await row.refresh()
        await order.refresh()
        const observation = await RefundObservation.findByOrFail('externalId', reference.id)
        assert.equal(row.state, 'resolved')
        assert.equal(observation.state, 'succeeded')
        assert.equal(order.financialStatus, 'refunded')
      } finally {
        releaseResponse()
        await firstLookup.catch(() => {})
        adapter.getRefund = original
      }
    })
  }

  test('a processing refund remains eligible for lookup without another webhook', async ({
    assert,
  }) => {
    const { order } = await capturedSubmission(adapter)
    const reference = { provider: adapter.provider, id: 'processing-refund' }
    adapter.refunds.set(reference.id, {
      ...reference,
      paymentId: 'captured-fixture',
      amount: 109800,
      currency: 'PHP',
      status: 'pending',
      liveMode: false,
    })
    const lookups = await app.container.make(RefundLookupService)
    const row = await lookups.request(reference, false, 'processing-event')
    await lookups.run(row.id)
    await row.refresh()
    assert.equal(row.state, 'pending')
    adapter.refunds.get(reference.id)!.status = 'succeeded'
    await lookups.run(row.id)
    await row.refresh()
    await order.refresh()
    assert.equal(row.state, 'resolved')
    assert.equal(order.financialStatus, 'refunded')
  })

  test('checkout submission without a CSRF token is rejected', async ({ client }) => {
    const { input } = await submission()

    const response = await client
      .post('/checkout')
      .header('accept', 'application/json')
      .form(input)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Invalid or expired CSRF token')
  })

  test('refund lookup recovery saves confirmed facts and audits operational problems without changing state', async ({
    assert,
  }) => {
    const { order, variant } = await capturedSubmission(adapter)
    adapter.refunds.set('dashboard-ref', {
      provider: adapter.provider,
      id: 'dashboard-ref',
      paymentId: 'captured-fixture',
      liveMode: false,
      amount: 109800,
      currency: 'PHP',
      status: 'succeeded',
    })
    const lookups = await app.container.make(RefundLookupService)
    const row = await lookups.request(
      { provider: adapter.provider, id: 'dashboard-ref' },
      false,
      'event-1'
    )
    await lookups.review(row.id)
    await lookups.retry(row.id)
    await lookups.run(row.id)
    await row.refresh()
    await order.refresh()
    assert.equal(row.state, 'resolved')
    assert.equal(order.financialStatus, 'refunded')
    // Model a lost publication acknowledgement so the audit has an explicit backlog to report.
    const unpublished = await WorkflowOutbox.query().where('kind', 'lookup_refund').firstOrFail()
    unpublished.publishedAt = null
    await unpublished.save()
    const auditService29 = await app.container.make(AuditService)
    const audit = await auditService29.read()
    assert.isEmpty(audit.issues.invalidStock)
    assert.isEmpty(audit.issues.invalidPrices)
    assert.deepEqual(audit.issues.unpublishedOutbox, [unpublished.id])
    await unpublished.refresh()
    assert.isNull(unpublished.publishedAt)
    await variant.refresh()
    assert.equal(variant.inventoryQuantity, 0)
  })

  test('stable persisted schedules survive registration twice and competing workers claim a due run once', async ({
    assert,
    cleanup,
  }) => {
    await PublishWorkflowOutbox.schedule({}).id('test-publisher').every('1m').run()
    await PublishWorkflowOutbox.schedule({}).id('test-publisher').every('1m').run()
    const loadeddb30 = await db.from('queue_schedules').count('* as count').first()
    assert.equal(loadeddb30.count, 1)
    await db.from('queue_schedules').update({ next_run_at: 1 })
    const first = databaseWorker()
    const second = databaseWorker()
    cleanup(async () => {
      await first.stop()
      await second.stop()
    })
    const loadedfirst31 = await first.processCycle(['maintenance'])
    assert.equal(loadedfirst31?.type, 'started')
    const loadedsecond32 = await second.processCycle(['maintenance'])
    assert.equal(loadedsecond32?.type, 'idle')
    const loadedfirst33 = await first.processCycle(['maintenance'])
    assert.equal(loadedfirst33?.type, 'completed')
    const loadeddb34 = await db.from('queue_schedules').first()
    assert.equal(loadeddb34.run_count, 1)
  })

  test('an unassigned captured fact can be bound by verified lookup without losing it or consuming stock twice', async ({
    assert,
  }) => {
    const { checkout, token, input, variant } = await submission()
    const { order } = await checkout.submit(token, undefined, input)
    const attempt = await Attempt.findByOrFail('orderId', order.id)
    const recovery = await app.container.make(RecoveryService)
    adapter.loseCheckoutResponse = true
    await assert.rejects(() => recovery.run(attempt.id))
    const remote = [...adapter.sessions.values()][0]
    remote.status = 'paid'
    remote.payments = [{ id: 'orphan-payment', amount: 109800, currency: 'PHP', status: 'paid' }]
    remote.metadata = {}
    const settlement = await app.container.make(SettlementService)
    await settlement.apply(remote)
    let payment = await Payment.firstOrFail()
    assert.isNull(payment.orderId)
    await recovery.run(attempt.id)
    payment = await Payment.firstOrFail()
    await order.refresh()
    await variant.refresh()
    assert.equal(payment.orderId, order.id)
    assert.equal(payment.disposition, 'accepted')
    assert.equal(order.financialStatus, 'paid')
    assert.equal(variant.inventoryQuantity, 0)
    await settlement.apply(remote)
    assert.lengthOf(await Payment.all(), 1)
  })

  test('competing shipment and refund requests serialize so an order cannot both ship and begin refunding', async ({
    assert,
  }) => {
    const { order } = await capturedSubmission(adapter)
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    const fulfillment = await app.container.make(FulfillmentService)
    const refunds = await app.container.make(RefundService)
    await fulfillment.pack(order.id, staff)
    const results = await Promise.allSettled([
      fulfillment.ship(order.id, staff, { carrier: 'Carrier', trackingNumber: 'RACE-123' }),
      refunds.requestFull(order.id, staff),
    ])
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
    const shipment = await Shipment.findByOrFail('orderId', order.id)
    await order.load('refunds')
    assert.isFalse(shipment.state === 'shipped' && order.refunds.length > 0)
  })

  test('staff routes authorize shared-store operations and online status cannot be manually forged', async ({
    client,
    assert,
  }) => {
    const { order } = await capturedSubmission(adapter)
    const customer = await UserFactory.create()
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    for (const path of ['packing', 'shipment', 'refund', 'cancel', 'operations']) {
      const denied = await client
        .post(`/seller/orders/${order.id}/${path}`)
        .loginAs(customer)
        .withCsrfToken()
        .accept('json')
      denied.assertStatus(403)
    }
    const forged = await client
      .patch(`/seller/orders/${order.id}`)
      .loginAs(staff)
      .withCsrfToken()
      .accept('json')
      .form({ financialStatus: 'refunded', fulfillmentStatus: 'fulfilled', note: null })
    forged.assertStatus(409)
    const packed = await client
      .post(`/seller/orders/${order.id}/packing`)
      .loginAs(staff)
      .withCsrfToken()
      .redirects(0)
    packed.assertStatus(302)
    const shipment = await Shipment.findByOrFail('orderId', order.id)
    assert.equal(shipment.state, 'packing')
  })
})

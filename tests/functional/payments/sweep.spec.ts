import { randomUUID } from 'node:crypto'
import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { QueueManager } from '@adonisjs/queue'
import { DateTime } from 'luxon'
import CartService from '#services/checkout/cart_service'
import QuoteService from '#services/checkout/quote_service'
import CheckoutService from '#services/checkout/checkout_service'
import InventoryService from '#services/catalog/inventory_service'
import RecoveryService from '#services/payments/recovery_service'
import SettlementService from '#services/payments/settlement_service'
import RefundService from '#services/payments/refund_service'
import RefundLookupService from '#services/payments/refund_lookup_service'
import PaymentService from '#services/payments/payment_service'
import DispatcherService from '#services/payments/dispatcher_service'
import FakePaymentAdapter from '#tests/helpers/fake_payment_adapter'
import SweepPaymentOperations from '#jobs/payments/sweep_payment_operations'
import ExpireCheckout from '#jobs/payments/expire_checkout'
import ReconcileCheckout from '#jobs/payments/reconcile_checkout'
import ReconcileRefund from '#jobs/payments/reconcile_refund'
import LookupRefund from '#jobs/payments/lookup_refund'
import SendNotification from '#jobs/checkout/send_notification'
import Attempt from '#models/payments/attempt'
import RefundOperation from '#models/payments/refund_operation'
import RefundLookup from '#models/payments/refund_lookup'
import Cart from '#models/checkout/cart'
import DiscountCode from '#models/checkout/discount_code'
import DiscountRedemption from '#models/checkout/discount_redemption'
import Notification from '#models/checkout/notification'
import StockReservation from '#models/checkout/stock_reservation'
import WorkflowOutbox from '#models/checkout/workflow_outbox'
import { UserFactory } from '#database/factories/user_factory'
import { ProductVariantFactory } from '#database/factories/product_variant_factory'

/** Older than every sweep's staleness threshold. */
function stale() {
  return DateTime.utc().minus({ minutes: 5 }).toSQL({ includeOffset: false })!
}

/** An online order awaiting payment, with an open provider checkout session. */
async function awaitingPayment(code?: string) {
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
  if (code) await carts.applyDiscount(token, undefined, code)
  const quotes = await app.container.make(QuoteService)
  const quote = await quotes.quote((await carts.load(token))!)
  const checkout = await app.container.make(CheckoutService)
  const { order } = await checkout.submit(token, undefined, {
    email: 'guest@example.com',
    shipping: {
      firstName: 'Guest',
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
  return { variant, order, attempt }
}

async function sweep() {
  const job = await app.container.make(SweepPaymentOperations)
  await job.execute()
}

function sweptCheckouts() {
  return WorkflowOutbox.query().where('operation_key', 'like', 'sweep:%')
}

test.group('Payment operations sweep', (group) => {
  let adapter: FakePaymentAdapter
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate()
    adapter = new FakePaymentAdapter()
    app.container.swap(PaymentService, () => new DispatcherService(adapter.provider, [adapter]))
    return async () => {
      app.container.restore(PaymentService)
      const inventory = await app.container.make(InventoryService)
      const reserved = await StockReservation.query().where('state', 'reserved')
      for (const orderId of new Set(reserved.map((row) => row.orderId)))
        await db.transaction((trx) => inventory.release(trx, orderId))
      await cleanup()
    }
  })

  test('queues a stalled unpaid order past its payment window to close, returning its stock and discount use', async ({
    assert,
  }) => {
    const code = await DiscountCode.create({
      code: 'SAVE10',
      kind: 'percentage',
      percentOff: 10,
      amountOffMinor: null,
      minimumSubtotalMinor: 0,
      usageLimit: null,
      timesUsed: 0,
      oncePerCustomer: false,
      active: true,
    })
    const { variant, order, attempt } = await awaitingPayment('SAVE10')
    await code.refresh()
    await variant.refresh()
    assert.equal(code.timesUsed, 1)
    assert.equal(variant.inventoryReservedQuantity, 2)

    // The delayed expiry job was lost and nothing has touched the attempt since.
    await Attempt.query()
      .where('id', attempt.id)
      .update({ expiresAtMs: Date.now() - 1, updatedAt: stale() })
    using queue = QueueManager.fake()
    await sweep()
    queue.assertPushed(ExpireCheckout.name, {
      queue: 'payments',
      payload: { entityId: attempt.id },
    })
    queue.assertPushedCount(1)
    const [swept] = await sweptCheckouts()
    assert.equal(swept.kind, 'expire_checkout')
    assert.equal(swept.entityId, attempt.id)

    // Running again in the same window does not queue the work twice.
    await sweep()
    assert.lengthOf(await sweptCheckouts(), 1)
    queue.assertPushedCount(1)

    // What the queued ExpireCheckout job runs.
    const recovery = await app.container.make(RecoveryService)
    await recovery.run(attempt.id, true)
    await order.refresh()
    await attempt.refresh()
    await variant.refresh()
    await code.refresh()
    assert.equal(order.lifecycleState, 'expired')
    assert.equal(attempt.state, 'expired')
    assert.equal(adapter.sessions.get(attempt.externalId!)!.status, 'expired')
    assert.equal(variant.inventoryReservedQuantity, 0)
    assert.equal(code.timesUsed, 0)
    const redemption = await DiscountRedemption.findByOrFail('orderId', order.id)
    assert.isNotNull(redemption.releasedAt)
    const cart = await Cart.findOrFail(order.cartId)
    assert.equal(cart.status, 'abandoned')

    // A closed attempt is no longer the sweep's concern.
    await Attempt.query().where('id', attempt.id).update({ updatedAt: stale() })
    await sweptCheckouts().update({ operationKey: 'sweep:earlier-window' })
    await sweep()
    assert.lengthOf(await sweptCheckouts(), 1)
  })

  test('queues a stalled attempt inside its payment window for reconciliation, so a missed payment still settles', async ({
    assert,
  }) => {
    const { order, attempt } = await awaitingPayment()
    await Attempt.query().where('id', attempt.id).update({ updatedAt: stale() })
    using queue = QueueManager.fake()
    await sweep()
    queue.assertPushed(ReconcileCheckout.name, {
      queue: 'payments',
      payload: { entityId: attempt.id },
    })
    queue.assertPushedCount(1)
    const [swept] = await sweptCheckouts()
    assert.equal(swept.kind, 'reconcile_checkout')

    // The customer paid but the webhook never arrived; reconciliation reads it from the provider.
    const session = adapter.sessions.get(attempt.externalId!)!
    session.status = 'paid'
    session.payments = [
      { id: 'captured-late', amount: order.totalMinor!, currency: 'PHP', status: 'paid' },
    ]
    // What the queued ReconcileCheckout job runs.
    const recovery = await app.container.make(RecoveryService)
    await recovery.run(attempt.id)
    await order.refresh()
    await attempt.refresh()
    assert.equal(attempt.state, 'paid')
    assert.equal(order.lifecycleState, 'confirmed')
    assert.equal(order.financialStatus, 'paid')
  })

  test('leaves attempts alone while they are recent, claimed by a worker or waiting on staff review', async ({
    assert,
  }) => {
    const recent = await awaitingPayment()
    const claimed = await awaitingPayment()
    const flagged = await awaitingPayment()
    await Attempt.query()
      .where('id', claimed.attempt.id)
      .update({ claimToken: randomUUID(), claimExpiresAtMs: Date.now() + 60_000 })
    await Attempt.query().where('id', flagged.attempt.id).update({ needsReview: true })
    await Attempt.query()
      .whereIn('id', [claimed.attempt.id, flagged.attempt.id])
      .update({ expiresAtMs: Date.now() - 1, updatedAt: stale() })
    await Attempt.query()
      .where('id', recent.attempt.id)
      .update({ expiresAtMs: Date.now() - 1 })

    using queue = QueueManager.fake()
    await sweep()
    queue.assertNothingPushed()
    assert.isEmpty(await sweptCheckouts())
  })

  test('one run also re-queues stalled refunds, refund lookups and notifications', async () => {
    const { order, attempt } = await awaitingPayment()
    const session = adapter.sessions.get(attempt.externalId!)!
    session.status = 'paid'
    session.payments = [
      { id: 'captured-fixture', amount: order.totalMinor!, currency: 'PHP', status: 'paid' },
    ]
    const settlement = await app.container.make(SettlementService)
    await settlement.apply(session)
    const notification = await Notification.query()
      .where('order_id', order.id)
      .where('state', 'pending')
      .firstOrFail()
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    const refunds = await app.container.make(RefundService)
    await refunds.requestFull(order.id, staff)
    const refund = await RefundOperation.findByOrFail('orderId', order.id)
    const lookups = await app.container.make(RefundLookupService)
    const lookup = await lookups.request(
      { provider: adapter.provider, id: 'opaque/refund/unknown' },
      false,
      null
    )

    // Every queued job was lost long ago and no worker has touched the rows since.
    await RefundOperation.query().where('id', refund.id).update({ updatedAt: stale() })
    await RefundLookup.query().where('id', lookup.id).update({ updatedAt: stale() })
    await Notification.query().where('id', notification.id).update({ updatedAt: stale() })
    await WorkflowOutbox.query().update({ createdAt: stale(), publishedAt: stale() })

    using queue = QueueManager.fake()
    await sweep()
    queue.assertPushed(ReconcileRefund.name, { payload: { entityId: refund.id } })
    queue.assertPushed(LookupRefund.name, { payload: { entityId: lookup.id } })
    queue.assertPushed(SendNotification.name, { payload: { entityId: notification.id } })
    queue.assertPushedCount(3)
  })
})

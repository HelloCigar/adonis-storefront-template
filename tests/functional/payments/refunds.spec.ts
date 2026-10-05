import { randomUUID } from 'node:crypto'
import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { QueueManager } from '@adonisjs/queue'
import { DateTime } from 'luxon'
import Payment from '#models/payments/payment'
import Attempt from '#models/payments/attempt'
import RefundObservation from '#models/payments/refund_observation'
import RefundOperation from '#models/payments/refund_operation'
import Shipment from '#models/checkout/shipment'
import WorkflowOutbox from '#models/checkout/workflow_outbox'
import StockReservation from '#models/checkout/stock_reservation'
import FulfillmentService from '#services/checkout/fulfillment_service'
import InventoryService from '#services/catalog/inventory_service'
import RefundService from '#services/payments/refund_service'
import SettlementService from '#services/payments/settlement_service'
import PaymentService, {
  type CheckoutSession,
  type PaymentRefund,
} from '#services/payments/payment_service'
import DispatcherService from '#services/payments/dispatcher_service'
import FakePaymentAdapter from '#tests/helpers/fake_payment_adapter'
import { OrderFactory } from '#database/factories/order_factory'
import { UserFactory } from '#database/factories/user_factory'
import { ProductVariantFactory } from '#database/factories/product_variant_factory'

async function paidOrder(provider: string) {
  const order = await OrderFactory.merge({
    source: 'online',
    lifecycleState: 'confirmed',
    financialStatus: 'paid',
    totalMinor: 109800,
  }).create()
  const payment = await Payment.create({
    orderId: order.id,
    attemptId: null,
    provider,
    liveMode: false,
    externalId: randomUUID(),
    amountMinor: order.totalMinor!,
    currency: 'PHP',
    disposition: 'accepted',
    capturedAt: DateTime.utc(),
  })
  await Shipment.create({ orderId: order.id, state: 'pending' })
  const staff = await UserFactory.merge({ role: 'staff' }).create()
  const result: PaymentRefund = {
    provider,
    liveMode: false,
    id: randomUUID(),
    paymentId: payment.externalId,
    amount: payment.amountMinor,
    currency: payment.currency,
    status: 'succeeded',
  }
  return { order, payment, staff, result }
}

async function pendingOrder(provider: string) {
  const order = await OrderFactory.merge({
    publicId: randomUUID(),
    source: 'online',
    lifecycleState: 'pending_payment',
    financialStatus: 'pending',
    totalMinor: 109800,
  }).create()
  const variant = await ProductVariantFactory.merge({
    availableForSale: true,
    inventoryQuantity: 2,
  }).create()
  const deadline = Date.now() + 900000
  const inventory = await app.container.make(InventoryService)
  await db.transaction((trx) =>
    inventory.reserve(trx, order.id, [{ variantId: variant.id, quantity: 2 }], deadline)
  )
  const idempotencyKey = randomUUID()
  const attempt = await Attempt.create({
    publicId: randomUUID(),
    orderId: order.id,
    provider,
    liveMode: false,
    amountMinor: order.totalMinor!,
    currency: 'PHP',
    state: 'pending',
    version: 0,
    idempotencyKey,
    externalId: randomUUID(),
    expiresAtMs: deadline,
    needsReview: false,
    requestSnapshot: {
      reference: order.publicId!,
      currency: 'PHP',
      items: [{ name: 'Order', unitAmount: order.totalMinor!, quantity: 1 }],
      successUrl: 'https://store.example/order',
      cancelUrl: 'https://store.example/order',
      idempotencyKey,
    },
  })
  const captureId = randomUUID()
  const checkout: CheckoutSession = {
    provider,
    id: attempt.externalId!,
    liveMode: false,
    reference: order.publicId,
    url: 'https://payments.example/checkout',
    metadata: { attemptId: attempt.publicId },
    status: 'paid',
    payments: [{ id: captureId, amount: order.totalMinor!, currency: 'PHP', status: 'paid' }],
  }
  const result: PaymentRefund = {
    provider,
    liveMode: false,
    id: randomUUID(),
    paymentId: captureId,
    amount: order.totalMinor!,
    currency: 'PHP',
    status: 'succeeded',
  }
  const staff = await UserFactory.merge({ role: 'staff' }).create()
  return { order, variant, attempt, checkout, result, staff }
}

test.group('Refund durability', (group) => {
  let adapter: FakePaymentAdapter
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate()
    adapter = new FakePaymentAdapter()
    app.container.swap(PaymentService, () => new DispatcherService(adapter.provider, [adapter]))
    return async () => {
      app.container.restore(PaymentService)
      const inventory = await app.container.make(InventoryService)
      const held = await StockReservation.query().where('state', 'reserved')
      for (const orderId of new Set(held.map((row) => row.orderId))) {
        await db.transaction((trx) => inventory.release(trx, orderId))
      }
      await cleanup()
    }
  })

  for (const initial of ['missing', 'pending'] as const) {
    test(`an interrupted external refund rolls back its ${initial} observation and balance, then retries once`, async ({
      assert,
    }) => {
      const { order, staff, result } = await paidOrder(adapter.provider)
      const refunds = await app.container.make(RefundService)
      if (initial === 'pending') await refunds.apply({ ...result, status: 'pending' })

      // Abort the real balance write after observation processing, without mocking DB queries.
      await db.rawQuery(`
        CREATE TRIGGER test_refund_balance_failure
        BEFORE UPDATE OF financial_status ON orders
        BEGIN
          SELECT RAISE(ABORT, 'Refund balance interrupted');
        END
      `)
      try {
        await assert.rejects(() => refunds.apply(result), /Refund balance interrupted/)
        const observation = await RefundObservation.findBy('externalId', result.id)
        if (initial === 'missing') assert.isNull(observation)
        else assert.equal(observation?.state, 'pending')
        await order.refresh()
        assert.equal(order.financialStatus, 'paid')
        assert.isEmpty(await RefundOperation.all())
      } finally {
        await db.rawQuery('DROP TRIGGER IF EXISTS test_refund_balance_failure')
      }

      await refunds.apply(result)
      await refunds.apply(result)
      await refunds.apply({ ...result, status: 'pending' })
      await refunds.apply({ ...result, status: 'failed' })
      const observation = await RefundObservation.findByOrFail('externalId', result.id)
      await order.refresh()
      assert.equal(observation.state, 'succeeded')
      assert.equal(order.financialStatus, 'refunded')
      assert.lengthOf(await RefundObservation.all(), 1)
      assert.isEmpty(await RefundOperation.all())
      assert.isEmpty(adapter.calls)
      const fulfillment = await app.container.make(FulfillmentService)
      await assert.rejects(() => fulfillment.pack(order.id, staff))
      await assert.rejects(
        () => refunds.requestFull(order.id, staff),
        'This payment is already refunded'
      )
    })
  }

  test('unmatched provider facts survive with monotonic success and immutable association', async ({
    assert,
  }) => {
    const { order, result } = await paidOrder(adapter.provider)
    const refunds = await app.container.make(RefundService)
    const unmatched = { ...result, paymentId: 'unmatched/provider/payment' }
    await refunds.apply(unmatched)
    await refunds.apply({ ...unmatched, status: 'failed' })
    await refunds.apply({ ...unmatched, status: 'pending' })
    await assert.rejects(
      () => refunds.apply({ ...unmatched, paymentId: result.paymentId }),
      'Refund resource facts changed'
    )
    const observation = await RefundObservation.findByOrFail('externalId', result.id)
    await order.refresh()
    assert.equal(observation.externalPaymentId, unmatched.paymentId)
    assert.equal(observation.state, 'succeeded')
    assert.isNull(observation.refundOperationId)
    assert.lengthOf(await RefundObservation.all(), 1)
    assert.isEmpty(await RefundOperation.all())
    assert.equal(order.financialStatus, 'paid')
  })

  test('verified success updates the balance while a superseded claim cannot complete the operation', async ({
    assert,
  }) => {
    using queue = QueueManager.fake()
    const { order, staff, result } = await paidOrder(adapter.provider)
    const refunds = await app.container.make(RefundService)
    const operation = await refunds.requestFull(order.id, staff)
    operation.merge({
      state: 'unknown',
      externalId: result.id,
      claimToken: 'current-owner',
      claimExpiresAtMs: Date.now() + 120000,
    })
    await operation.save()

    await refunds.apply(result, operation.id, 'superseded-owner')
    await order.refresh()
    await operation.refresh()
    assert.equal(order.financialStatus, 'refunded')
    assert.equal(operation.state, 'unknown')
    assert.equal(operation.claimToken, 'current-owner')
    await refunds.apply(result, operation.id, 'current-owner')
    await operation.refresh()
    assert.equal(operation.state, 'succeeded')
    assert.isNull(operation.claimToken)
    queue.assertPushedCount(1)
    assert.isEmpty(adapter.calls)
  })

  test('an observed pending refund blocks a new mutation and preserves an existing operation replay', async ({
    assert,
  }) => {
    using queue = QueueManager.fake()
    const { order, payment, staff, result } = await paidOrder(adapter.provider)
    const refunds = await app.container.make(RefundService)
    const partial = { ...result, amount: payment.amountMinor / 2 }
    await refunds.apply({ ...partial, status: 'pending' })
    await assert.rejects(
      () => refunds.requestFull(order.id, staff),
      'A provider refund is still pending. Reconcile it before requesting another refund.'
    )
    assert.isEmpty(await RefundOperation.all())
    assert.isEmpty(await WorkflowOutbox.query().where('kind', 'submit_refund'))
    const fulfillment = await app.container.make(FulfillmentService)
    await assert.rejects(() => fulfillment.pack(order.id, staff))
    await order.refresh()
    assert.equal(order.financialStatus, 'paid')

    await refunds.apply({ ...partial, status: 'failed' })
    const operation = await refunds.requestFull(order.id, staff)
    assert.equal(operation.amountMinor, payment.amountMinor)
    await refunds.apply({ ...partial, status: 'pending' })
    const replay = await refunds.requestFull(order.id, staff)
    assert.equal(replay.id, operation.id)
    assert.lengthOf(await RefundOperation.all(), 1)
    queue.assertPushedCount(2)
    assert.isEmpty(adapter.calls)
  })

  test('a stale success for a distinct refund resource updates its payment without completing the current operation', async ({
    assert,
  }) => {
    using queue = QueueManager.fake()
    const { order, staff, result } = await paidOrder(adapter.provider)
    const refunds = await app.container.make(RefundService)
    const operation = await refunds.requestFull(order.id, staff)
    const currentResource = randomUUID()
    operation.merge({
      state: 'unknown',
      externalId: currentResource,
      claimToken: 'current-owner',
      claimExpiresAtMs: Date.now() + 120000,
      needsReview: true,
    })
    await operation.save()

    await refunds.apply(result, operation.id, 'superseded-owner')
    await refunds.apply(result, operation.id, 'superseded-owner')
    const observation = await RefundObservation.findByOrFail('externalId', result.id)
    await order.refresh()
    await operation.refresh()
    assert.equal(order.financialStatus, 'refunded')
    assert.equal(observation.state, 'succeeded')
    assert.isNull(observation.refundOperationId)
    assert.equal(operation.state, 'unknown')
    assert.equal(operation.externalId, currentResource)
    assert.equal(operation.claimToken, 'current-owner')
    assert.isTrue(operation.needsReview)
    queue.assertPushedCount(1)
    assert.isEmpty(adapter.calls)
  })

  test('wrong-currency facts stay visible for review without changing balances or allowing another refund', async ({
    assert,
  }) => {
    const { order, payment, staff, result } = await paidOrder(adapter.provider)
    const refunds = await app.container.make(RefundService)
    const extra = await Payment.create({
      orderId: order.id,
      attemptId: null,
      provider: adapter.provider,
      liveMode: false,
      externalId: randomUUID(),
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      disposition: 'overpayment',
      capturedAt: DateTime.utc(),
    })
    order.lifecycleState = 'review_required'
    order.reviewReason = 'Payment requires reconciliation; fulfillment is blocked.'
    await order.save()

    await refunds.apply({ ...result, currency: 'USD' })
    const observation = await RefundObservation.findByOrFail('externalId', result.id)
    await order.refresh()
    assert.equal(observation.currency, 'USD')
    assert.equal(observation.state, 'succeeded')
    assert.equal(order.financialStatus, 'paid')
    assert.equal(order.lifecycleState, 'review_required')
    assert.equal(
      order.reviewReason,
      'A provider refund currency does not match its captured payment.'
    )
    await assert.rejects(
      () => refunds.requestFull(order.id, staff),
      'A provider refund currency does not match this payment. Reconcile it before requesting another refund.'
    )
    assert.isEmpty(await RefundOperation.all())

    // Resolving the extra capture must not clear the independent currency review.
    await refunds.apply({ ...result, id: randomUUID(), paymentId: extra.externalId })
    await order.refresh()
    assert.equal(order.financialStatus, 'paid')
    assert.equal(order.lifecycleState, 'review_required')
    assert.equal(
      order.reviewReason,
      'A provider refund currency does not match its captured payment.'
    )
    const fulfillment = await app.container.make(FulfillmentService)
    await assert.rejects(() => fulfillment.pack(order.id, staff))
    assert.isEmpty(adapter.calls)
  })

  test('a wrong-currency refund arriving before capture binding preserves holds and requires review', async ({
    assert,
  }) => {
    const { order, variant, attempt, checkout, result, staff } = await pendingOrder(
      adapter.provider
    )
    const refunds = await app.container.make(RefundService)
    await refunds.apply({ ...result, currency: 'USD' })
    assert.isEmpty(await Payment.all())
    const settlement = await app.container.make(SettlementService)
    await settlement.apply(checkout, attempt.id)
    await settlement.apply(checkout, attempt.id)
    const payment = await Payment.findByOrFail('externalId', result.paymentId)
    const observation = await RefundObservation.findByOrFail('externalId', result.id)
    await order.refresh()
    await variant.refresh()
    await attempt.refresh()
    assert.equal(payment.disposition, 'review_required')
    assert.equal(payment.amountMinor, checkout.payments[0].amount)
    assert.equal(payment.currency, 'PHP')
    assert.equal(observation.currency, 'USD')
    assert.equal(observation.state, 'succeeded')
    assert.equal(order.financialStatus, 'pending')
    assert.equal(order.lifecycleState, 'review_required')
    assert.equal(
      order.reviewReason,
      'A provider refund currency does not match its captured payment.'
    )
    assert.isTrue(attempt.needsReview)
    assert.equal(variant.inventoryQuantity, 2)
    assert.equal(variant.inventoryReservedQuantity, 2)
    const hold = await StockReservation.findByOrFail('orderId', order.id)
    assert.equal(hold.state, 'reserved')
    assert.lengthOf(await Payment.all(), 1)
    assert.lengthOf(await RefundObservation.all(), 1)
    const fulfillment = await app.container.make(FulfillmentService)
    await assert.rejects(() => fulfillment.pack(order.id, staff))
    await assert.rejects(
      () => refunds.requestFull(order.id, staff, payment.id),
      'A provider refund currency does not match this payment. Reconcile it before requesting another refund.'
    )
    assert.isEmpty(await RefundOperation.all())
    assert.isEmpty(adapter.calls)
  })

  test('a matching-currency refund arriving before capture binding retains the accepted balance semantics', async ({
    assert,
  }) => {
    using queue = QueueManager.fake()
    const { order, variant, attempt, checkout, result, staff } = await pendingOrder(
      adapter.provider
    )
    const refunds = await app.container.make(RefundService)
    const amount = result.amount / 2
    await refunds.apply({ ...result, amount })
    const settlement = await app.container.make(SettlementService)
    await settlement.apply(checkout, attempt.id)
    await settlement.apply(checkout, attempt.id)
    const payment = await Payment.findByOrFail('externalId', result.paymentId)
    await order.refresh()
    await variant.refresh()
    await attempt.refresh()
    assert.equal(payment.disposition, 'accepted')
    assert.equal(order.financialStatus, 'partially_refunded')
    assert.equal(order.lifecycleState, 'confirmed')
    assert.isFalse(attempt.needsReview)
    assert.equal(variant.inventoryQuantity, 0)
    assert.equal(variant.inventoryReservedQuantity, 0)
    const hold = await StockReservation.findByOrFail('orderId', order.id)
    assert.equal(hold.state, 'consumed')
    assert.lengthOf(await Payment.all(), 1)
    const operation = await refunds.requestFull(order.id, staff, payment.id)
    assert.equal(operation.amountMinor, payment.amountMinor - amount)
    queue.assertPushedCount(2)
    assert.isEmpty(adapter.calls)
  })
})

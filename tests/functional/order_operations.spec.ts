import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import Payment from '#models/payments/payment'
import Attempt from '#models/payments/attempt'
import RefundObservation from '#models/payments/refund_observation'
import RefundOperation from '#models/payments/refund_operation'
import Shipment from '#models/checkout/shipment'
import StockReservation from '#models/checkout/stock_reservation'
import FulfillmentService from '#services/checkout/fulfillment_service'
import { OrderFactory } from '../../database/factories/order_factory.js'
import { UserFactory } from '../../database/factories/user_factory.js'
import { ProductVariantFactory } from '../../database/factories/product_variant_factory.js'

async function paidOrder() {
  const order = await OrderFactory.merge({
    source: 'online',
    lifecycleState: 'confirmed',
    financialStatus: 'paid',
    totalMinor: 59900,
  }).create()
  const payment = await Payment.create({
    orderId: order.id,
    provider: 'order-operations',
    liveMode: false,
    externalId: randomUUID(),
    amountMinor: 59900,
    currency: 'PHP',
    disposition: 'accepted',
    capturedAt: DateTime.utc(),
  })
  await Shipment.create({ orderId: order.id, state: 'pending' })
  const staff = await UserFactory.merge({ role: 'staff' }).create()
  return { order, payment, staff }
}

test.group('Order operations availability', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('the detail page follows guarded packing state and preserves manual order controls', async ({
    client,
    assert,
  }) => {
    const { order, staff } = await paidOrder()
    const response = await client.get(`/seller/orders/${order.id}`).loginAs(staff).withInertia()
    response.assertOk()
    assert.isTrue(response.inertiaProps.operations.canPack)
    assert.isFalse(response.inertiaProps.operations.canShip)
    const fulfillment = await app.container.make(FulfillmentService)
    await fulfillment.pack(order.id, staff)
    const packed = await client.get(`/seller/orders/${order.id}`).loginAs(staff).withInertia()
    assert.isFalse(packed.inertiaProps.operations.canPack)
    assert.isTrue(packed.inertiaProps.operations.canShip)
    const manual = await OrderFactory.create()
    const legacy = await client.get(`/seller/orders/${manual.id}`).loginAs(staff).withInertia()
    legacy.assertOk()
    assert.isNull(legacy.inertiaProps.operations)
  })

  test('a provider-only pending refund blocks the same actions as the fulfillment transaction', async ({
    client,
    assert,
  }) => {
    const { order, payment, staff } = await paidOrder()
    await RefundObservation.create({
      provider: payment.provider,
      liveMode: false,
      externalId: randomUUID(),
      externalPaymentId: payment.externalId,
      amountMinor: 59900,
      currency: 'PHP',
      state: 'pending',
    })
    const response = await client.get(`/seller/orders/${order.id}`).loginAs(staff).withInertia()
    response.assertOk()
    assert.isFalse(response.inertiaProps.operations.canPack)
    assert.isFalse(response.inertiaProps.operations.canShip)
    assert.isFalse(response.inertiaProps.operations.payments[0].canRefund)
    assert.isFalse(response.inertiaProps.operations.canCancel)
    assert.equal(
      response.inertiaProps.operations.cancelBlocker,
      'Reconcile the provider refund before cancelling this order.'
    )
    assert.lengthOf(response.inertiaProps.operations.observedRefunds, 1)
    assert.deepEqual(
      response.inertiaProps.operations.issues.map((issue: { cause: string }) => issue.cause),
      ['refund']
    )
    assert.equal(response.inertiaProps.operations.issues[0].fix, 'review_refunds')
    const fulfillment = await app.container.make(FulfillmentService)
    await assert.rejects(() => fulfillment.pack(order.id, staff), /prevents shipment/)
  })

  test('restocked inventory is blocked in both the detail page and packing', async ({
    client,
    assert,
  }) => {
    const { order, staff } = await paidOrder()
    const variant = await ProductVariantFactory.create()
    await StockReservation.create({
      orderId: order.id,
      productVariantId: variant.id,
      quantity: 1,
      state: 'consumed',
      expiresAtMs: Date.now(),
      restockedAt: DateTime.utc(),
    })
    const response = await client.get(`/seller/orders/${order.id}`).loginAs(staff).withInertia()
    response.assertOk()
    assert.isFalse(response.inertiaProps.operations.canPack)
    const [inventory] = response.inertiaProps.operations.issues
    assert.equal(inventory.cause, 'inventory')
    assert.equal(inventory.fix, 'check_stock')
    const fulfillment = await app.container.make(FulfillmentService)
    await assert.rejects(() => fulfillment.pack(order.id, staff), /prevents shipment/)
  })

  test('issues lead with the payment root cause and point to the reconcile form', async ({
    client,
    assert,
  }) => {
    const { order, staff } = await paidOrder()
    await order.merge({ lifecycleState: 'review_required', reviewReason: null }).save()
    await Attempt.create({
      publicId: randomUUID(),
      orderId: order.id,
      provider: 'order-operations',
      liveMode: false,
      amountMinor: 59900,
      currency: 'PHP',
      state: 'unknown',
      version: 0,
      idempotencyKey: randomUUID(),
      expiresAtMs: Date.now() + 60_000,
      replayScope: 'resource',
      needsReview: true,
      requestSnapshot: {
        reference: order.publicId ?? randomUUID(),
        currency: 'PHP',
        idempotencyKey: randomUUID(),
        items: [{ name: 'Order', unitAmount: 59900, quantity: 1 }],
        successUrl: 'https://store.test/orders',
        cancelUrl: 'https://store.test/orders',
      },
    })
    await Shipment.query().where('orderId', order.id).delete()
    const response = await client.get(`/seller/orders/${order.id}`).loginAs(staff).withInertia()
    const issues = response.inertiaProps.operations.issues
    assert.deepEqual(
      issues.map((issue: { cause: string }) => issue.cause),
      ['payment', 'shipment']
    )
    assert.equal(issues[0].fix, 'reconcile_checkout')
    assert.equal(issues[1].fix, 'contact_admin')
  })

  test('the cancellation preview states the refund and the stock that will return', async ({
    client,
    assert,
  }) => {
    const { order, staff } = await paidOrder()
    const variant = await ProductVariantFactory.create()
    await StockReservation.create({
      orderId: order.id,
      productVariantId: variant.id,
      quantity: 2,
      state: 'consumed',
      expiresAtMs: Date.now(),
    })
    const response = await client.get(`/seller/orders/${order.id}`).loginAs(staff).withInertia()
    assert.isTrue(response.inertiaProps.operations.canCancel)
    assert.deepInclude(response.inertiaProps.operations.cancellation, {
      closesCheckout: false,
      returnedQuantity: 2,
    })
    assert.lengthOf(response.inertiaProps.operations.cancellation.refunds, 1)
    assert.deepInclude(response.inertiaProps.operations.cancellation.refunds[0], {
      amountMinor: 59900,
      currency: 'PHP',
      existing: false,
    })
  })

  test('refund amounts use the remaining matching currency and reject mismatched observations', async ({
    client,
    assert,
  }) => {
    const { order, payment, staff } = await paidOrder()
    await RefundObservation.create({
      provider: payment.provider,
      liveMode: false,
      externalId: randomUUID(),
      externalPaymentId: payment.externalId,
      amountMinor: 10000,
      currency: 'PHP',
      state: 'succeeded',
    })
    const response = await client.get(`/seller/orders/${order.id}`).loginAs(staff).withInertia()
    assert.isTrue(response.inertiaProps.operations.payments[0].canRefund)
    assert.equal(response.inertiaProps.operations.payments[0].refundableAmountMinor, 49900)
    await RefundObservation.create({
      provider: payment.provider,
      liveMode: false,
      externalId: randomUUID(),
      externalPaymentId: payment.externalId,
      amountMinor: 59900,
      currency: 'USD',
      state: 'succeeded',
    })
    const mismatch = await client.get(`/seller/orders/${order.id}`).loginAs(staff).withInertia()
    assert.isFalse(mismatch.inertiaProps.operations.payments[0].canRefund)
    assert.equal(mismatch.inertiaProps.operations.payments[0].refundableAmountMinor, 49900)
    assert.includeMembers(
      mismatch.inertiaProps.operations.observedRefunds.map(
        (refund: { currency: string }) => refund.currency
      ),
      ['PHP', 'USD']
    )
    assert.isFalse(mismatch.inertiaProps.operations.canCancel)
  })

  test('an existing refund operation still permits cancellation without a new provider mutation', async ({
    client,
    assert,
  }) => {
    const { order, payment, staff } = await paidOrder()
    const refund = await RefundOperation.create({
      orderId: order.id,
      paymentId: payment.id,
      provider: payment.provider,
      liveMode: payment.liveMode,
      amountMinor: payment.amountMinor,
      reason: 'requested_by_customer',
      idempotencyKey: randomUUID(),
      state: 'pending',
      actorId: staff.id,
      replayScope: 'resource',
      needsReview: false,
    })
    await RefundObservation.create({
      provider: payment.provider,
      liveMode: payment.liveMode,
      externalId: randomUUID(),
      externalPaymentId: payment.externalId,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      state: 'pending',
      refundOperationId: refund.id,
    })
    const response = await client.get(`/seller/orders/${order.id}`).loginAs(staff).withInertia()
    assert.isTrue(response.inertiaProps.operations.canCancel)
    assert.isTrue(response.inertiaProps.operations.cancellation.refunds[0].existing)
    const fulfillment = await app.container.make(FulfillmentService)
    await fulfillment.cancel(order.id, staff)
    await order.refresh()
    assert.equal(order.lifecycleState, 'cancelled')
    assert.lengthOf(await RefundOperation.query().where('orderId', order.id), 1)
  })
})

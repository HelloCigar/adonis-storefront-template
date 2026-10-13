import { test, timeTravel } from '@japa/runner'
import Payment from '#models/payments/payment'
import RefundOperation from '#models/payments/refund_operation'
import Shipment from '#models/checkout/shipment'
import { UserFactory } from '#database/factories/user_factory'
import { runQueue } from '#tests/helpers/queue'
import {
  checkoutOpened,
  orderTotalMinor,
  paidOrder,
  resetCheckoutState,
  sendWebhook,
  useFakeProvider,
} from '#tests/helpers/payments'
import { urlFor } from '@adonisjs/core/services/url_builder'

test.group('Payment webhooks', (group) => {
  group.each.setup(() => resetCheckoutState())

  test('a signed paid-checkout webhook confirms the order and uses up its stock', async ({
    client,
    assert,
  }) => {
    const provider = useFakeProvider()
    const { order, attempt, variant } = await checkoutOpened()
    provider.capture(attempt.externalId!, { id: 'pay_1', amount: orderTotalMinor })

    const response = await sendWebhook(client, provider, {
      id: 'evt_paid',
      type: 'checkout.paid',
      checkoutId: attempt.externalId!,
    })

    response.assertStatus(200)
    await order.refresh()
    await variant.refresh()
    assert.equal(order.lifecycleState, 'confirmed')
    assert.equal(order.financialStatus, 'paid')
    assert.equal(variant.inventoryQuantity, 0)
    assert.equal(variant.inventoryReservedQuantity, 0)
  })

  test('a paid webhook sent twice records one payment', async ({ client, db }) => {
    const provider = useFakeProvider()
    const { attempt, variant } = await checkoutOpened()
    provider.capture(attempt.externalId!, { id: 'pay_1', amount: orderTotalMinor })
    const event = {
      id: 'evt_paid',
      type: 'checkout.paid',
      checkoutId: attempt.externalId!,
    } as const

    await sendWebhook(client, provider, event)
    await sendWebhook(client, provider, event)

    await db.assertCount('payments', 1)
    await db.assertHas('product_variants', { id: variant.id, inventory_quantity: 0 })
  })

  test('an unsigned or tampered webhook is rejected and changes nothing', async ({
    client,
    assert,
    db,
  }) => {
    const provider = useFakeProvider()
    const { order, attempt } = await checkoutOpened()
    provider.capture(attempt.externalId!, { id: 'pay_1', amount: orderTotalMinor })
    const signed = provider.webhook({
      id: 'evt_paid',
      type: 'checkout.paid',
      checkoutId: attempt.externalId!,
    })

    const tampered = await client
      .post(urlFor('payments.webhooks.store', { provider: provider.provider }))
      .header('content-type', 'application/json')
      .headers(signed.headers)
      .unsafeJson(`${signed.rawBody} `)
    const unsigned = await client
      .post(urlFor('payments.webhooks.store', { provider: provider.provider }))
      .header('content-type', 'application/json')
      .unsafeJson(signed.rawBody)

    tampered.assertStatus(401)
    unsigned.assertStatus(401)
    await db.assertEmpty('payments')
    await order.refresh()
    assert.equal(order.lifecycleState, 'pending_payment')
  })

  test('a second capture on a paid order is held for review without using stock twice', async ({
    client,
    assert,
  }) => {
    const provider = useFakeProvider()
    const { order, variant, checkoutId } = await paidOrder(client, provider)
    provider.capture(checkoutId, { id: 'pay_extra', amount: orderTotalMinor })

    await sendWebhook(client, provider, { id: 'evt_extra', type: 'checkout.paid', checkoutId })

    await order.refresh()
    await variant.refresh()
    assert.equal(order.lifecycleState, 'review_required')
    assert.equal(variant.inventoryQuantity, 0)
    const extra = await Payment.findByOrFail('externalId', 'pay_extra')
    assert.equal(extra.disposition, 'overpayment')
  })

  test('a capture whose total does not match keeps the payment and blocks shipping', async ({
    client,
    assert,
  }) => {
    const provider = useFakeProvider()
    const { order, attempt } = await checkoutOpened()
    provider.capture(attempt.externalId!, { id: 'pay_short', amount: 10_000 })
    const staff = await UserFactory.merge({ role: 'staff' }).create()

    await sendWebhook(client, provider, {
      id: 'evt_short',
      type: 'checkout.paid',
      checkoutId: attempt.externalId!,
    })
    await client
      .post(urlFor('seller.packing.store', { id: order.id }))
      .loginAs(staff)
      .withCsrfToken()
      .redirects(0)

    await order.refresh()
    assert.equal(order.lifecycleState, 'review_required')
    const payment = await Payment.findByOrFail('externalId', 'pay_short')
    assert.equal(payment.amountMinor, 10_000)
    assert.equal(payment.disposition, 'review_required')
    assert.isNull(
      await Shipment.query().where('order_id', order.id).whereNot('state', 'pending').first()
    )
  })

  test('a short capture can be refunded for the amount captured', async ({ client, assert }) => {
    const provider = useFakeProvider()
    const { order, attempt } = await checkoutOpened()
    provider.capture(attempt.externalId!, { id: 'pay_short', amount: 10_000 })
    await sendWebhook(client, provider, {
      id: 'evt_short',
      type: 'checkout.paid',
      checkoutId: attempt.externalId!,
    })
    const payment = await Payment.findByOrFail('externalId', 'pay_short')
    const staff = await UserFactory.merge({ role: 'staff' }).create()

    await client
      .post(urlFor('seller.refunds.store', { id: order.id }))
      .loginAs(staff)
      .withCsrfToken()
      .form({ paymentId: payment.id })
      .redirects(0)

    const operation = await RefundOperation.findByOrFail('orderId', order.id)
    assert.equal(operation.amountMinor, 10_000)
  })

  test('a capture that arrives after the checkout expired is flagged for review', async ({
    client,
    assert,
  }) => {
    const provider = useFakeProvider()
    const { order, attempt, variant } = await checkoutOpened()
    timeTravel(new Date(attempt.expiresAtMs + 1000))
    await runQueue(['payments'])
    await order.refresh()
    assert.equal(order.lifecycleState, 'expired')
    provider.capture(attempt.externalId!, { id: 'pay_late', amount: orderTotalMinor })

    await sendWebhook(client, provider, {
      id: 'evt_late',
      type: 'checkout.paid',
      checkoutId: attempt.externalId!,
    })

    await order.refresh()
    await variant.refresh()
    assert.equal(order.lifecycleState, 'review_required')
    const late = await Payment.findByOrFail('externalId', 'pay_late')
    assert.equal(late.disposition, 'review_required')
    assert.equal(variant.inventoryQuantity, 2)
  })

  test('a refund update with missing details queues a lookup and makes no call to the provider', async ({
    client,
    assert,
    db,
  }) => {
    const provider = useFakeProvider()
    await paidOrder(client, provider)
    const callsBefore = provider.calls.length

    const response = await sendWebhook(client, provider, {
      id: 'evt_sparse',
      type: 'refund.reconcile',
      refundId: 'ref_sparse',
    })

    response.assertStatus(200)
    await db.assertHas('refund_lookups', { external_id: 'ref_sparse', state: 'pending' })
    assert.lengthOf(provider.calls, callsBefore)
  })

  test('a confirmed refund stays succeeded when an older failure arrives later', async ({
    client,
    assert,
  }) => {
    const provider = useFakeProvider()
    const { order } = await paidOrder(client, provider)
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    await client
      .post(urlFor('seller.refunds.store', { id: order.id }))
      .loginAs(staff)
      .withCsrfToken()
      .redirects(0)
    await runQueue(['payments'])
    const operation = await RefundOperation.findByOrFail('orderId', order.id)
    const remote = provider.refunds.get(operation.externalId!)!
    remote.status = 'succeeded'
    await sendWebhook(client, provider, {
      id: 'evt_ok',
      type: 'refund.updated',
      refundId: remote.id,
    })

    remote.status = 'failed'
    await sendWebhook(client, provider, {
      id: 'evt_old',
      type: 'refund.updated',
      refundId: remote.id,
    })

    await operation.refresh()
    await order.refresh()
    assert.equal(operation.state, 'succeeded')
    assert.equal(order.financialStatus, 'refunded')
  })

  test("a refund made on the provider's side blocks shipment", async ({ client, assert }) => {
    const provider = useFakeProvider()
    const { order } = await paidOrder(client, provider)
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    provider.addRefund({
      id: 'ref_dashboard',
      paymentId: 'pay_accepted',
      amount: orderTotalMinor,
      currency: 'PHP',
      status: 'succeeded',
    })

    await sendWebhook(client, provider, {
      id: 'evt_dashboard',
      type: 'refund.updated',
      refundId: 'ref_dashboard',
    })
    await client
      .post(urlFor('seller.packing.store', { id: order.id }))
      .loginAs(staff)
      .withCsrfToken()
      .redirects(0)

    await order.refresh()
    assert.equal(order.financialStatus, 'refunded')
    const shipment = await Shipment.findByOrFail('orderId', order.id)
    assert.equal(shipment.state, 'pending')
  })
})

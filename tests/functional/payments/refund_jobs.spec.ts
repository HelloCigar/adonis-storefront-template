import { test, timeTravel } from '@japa/runner'
import RefundObservation from '#models/payments/refund_observation'
import RefundLookup from '#models/payments/refund_lookup'
import RefundOperation from '#models/payments/refund_operation'
import { UserFactory } from '#database/factories/user_factory'
import FakePaymentAdapter from '#tests/helpers/fake_payment_adapter'
import { databaseWorker, passRetryDelay, runQueue } from '#tests/helpers/queue'
import {
  orderTotalMinor,
  paidOrder,
  resetCheckoutState,
  runSweep,
  sendWebhook,
  useFakeProvider,
} from '#tests/helpers/payments'

test.group('Payment refund jobs', (group) => {
  group.each.setup(() => resetCheckoutState())

  test('a staff refund keeps one key through a rejection and through a lost response', async ({
    client,
    assert,
  }) => {
    const provider = useFakeProvider()
    const { order } = await paidOrder(client, provider)
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    await client
      .post(`/seller/orders/${order.id}/refund`)
      .loginAs(staff)
      .withCsrfToken()
      .redirects(0)
    provider.rejectRefundOnce = true
    provider.loseRefundResponse = true

    await runQueue(['payments'])
    passRetryDelay()
    await runQueue(['payments'])
    passRetryDelay()
    await runQueue(['payments'])

    const operation = await RefundOperation.findByOrFail('orderId', order.id)
    assert.equal(operation.state, 'pending')
    assert.equal(provider.refunds.size, 1)
    const keys = provider.calls.filter((call) => call.startsWith('refund:'))
    assert.lengthOf(keys, 3)
    assert.lengthOf(new Set(keys), 1)
  })

  test('cancelling a paid order restocks once and waits for the refund to be confirmed', async ({
    client,
    assert,
  }) => {
    const provider = useFakeProvider()
    const { order, variant } = await paidOrder(client, provider)
    const staff = await UserFactory.merge({ role: 'staff' }).create()

    for (let request = 0; request < 2; request++)
      await client
        .post(`/seller/orders/${order.id}/cancel`)
        .loginAs(staff)
        .withCsrfToken()
        .redirects(0)
    await runQueue(['payments'])

    await order.refresh()
    await variant.refresh()
    assert.equal(order.lifecycleState, 'cancelled')
    assert.equal(order.financialStatus, 'paid')
    assert.equal(variant.inventoryQuantity, 2)
    const operation = await RefundOperation.findByOrFail('orderId', order.id)
    assert.equal(operation.state, 'pending')
  })

  test('a refund lookup saves what the provider confirmed', async ({ client, assert }) => {
    const provider = useFakeProvider()
    const { order } = await paidOrder(client, provider)
    provider.addRefund({
      id: 'ref_dashboard',
      paymentId: 'pay_accepted',
      amount: orderTotalMinor,
      currency: 'PHP',
      status: 'succeeded',
    })
    await sendWebhook(client, provider, {
      id: 'evt_sparse',
      type: 'refund.reconcile',
      refundId: 'ref_dashboard',
    })

    await runQueue(['payments'])

    const lookup = await RefundLookup.findByOrFail('externalId', 'ref_dashboard')
    await order.refresh()
    assert.equal(lookup.state, 'resolved')
    assert.equal(order.financialStatus, 'refunded')
  })

  test('an older lookup failure cannot mark newer work for review', async ({ client, assert }) => {
    const provider = useFakeProvider()
    await paidOrder(client, provider)
    provider.addRefund({
      id: 'ref_dashboard',
      paymentId: 'pay_accepted',
      amount: orderTotalMinor,
      currency: 'PHP',
      status: 'succeeded',
    })
    const sparse = { type: 'refund.reconcile', refundId: 'ref_dashboard' } as const
    await sendWebhook(client, provider, { ...sparse, id: 'evt_first' })
    const held = provider.holdNextCall('getRefund')
    const earlier = databaseWorker()
    const started = await earlier.processCycle(['payments'])
    assert.equal(started?.type, 'started')
    await held.reached

    await sendWebhook(client, provider, { ...sparse, id: 'evt_second' })
    await runQueue(['payments'])
    held.fail()
    const completed = await earlier.processCycle(['payments'])
    assert.equal(completed?.type, 'completed')

    const lookup = await RefundLookup.findByOrFail('externalId', 'ref_dashboard')
    assert.equal(lookup.state, 'resolved')
    assert.isNull(lookup.lastError)
  })

  test('an order paid through the old default provider is refunded through that same provider', async ({
    client,
    assert,
  }) => {
    const original = useFakeProvider()
    const { order } = await paidOrder(client, original)
    const next = new FakePaymentAdapter('next')
    useFakeProvider([next, original])
    const staff = await UserFactory.merge({ role: 'staff' }).create()

    await client
      .post(`/seller/orders/${order.id}/refund`)
      .loginAs(staff)
      .withCsrfToken()
      .redirects(0)
    await runQueue(['payments'])

    assert.equal(original.refunds.size, 1)
    assert.isEmpty(next.calls)
  })

  test('a stale failure arriving with the success cannot undo the refund', async ({
    client,
    assert,
  }) => {
    const provider = useFakeProvider()
    const { order } = await paidOrder(client, provider)
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    await client
      .post(`/seller/orders/${order.id}/refund`)
      .loginAs(staff)
      .withCsrfToken()
      .redirects(0)
    await runQueue(['payments'])
    const operation = await RefundOperation.findByOrFail('orderId', order.id)
    const refundId = operation.externalId!

    await Promise.all([
      sendWebhook(client, provider, {
        id: 'evt_failed',
        type: 'refund.updated',
        refundId,
        status: 'failed',
      }),
      sendWebhook(client, provider, {
        id: 'evt_ok',
        type: 'refund.updated',
        refundId,
        status: 'succeeded',
      }),
    ])
    await sendWebhook(client, provider, {
      id: 'evt_late',
      type: 'refund.updated',
      refundId,
      status: 'failed',
    })

    const observation = await RefundObservation.findByOrFail('externalId', refundId)
    await operation.refresh()
    await order.refresh()
    assert.equal(observation.state, 'succeeded')
    assert.equal(operation.state, 'succeeded')
    assert.equal(order.financialStatus, 'refunded')
  })

  test('a fully refunded order cannot be refunded again', async ({ client, db }) => {
    const provider = useFakeProvider()
    const { order } = await paidOrder(client, provider)
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    const requestRefund = () =>
      client.post(`/seller/orders/${order.id}/refund`).loginAs(staff).withCsrfToken().redirects(0)
    await requestRefund()
    await runQueue(['payments'])
    const operation = await RefundOperation.findByOrFail('orderId', order.id)
    await sendWebhook(client, provider, {
      id: 'evt_ok',
      type: 'refund.updated',
      refundId: operation.externalId!,
      status: 'succeeded',
    })

    await requestRefund()
    await runQueue(['payments'])

    await db.assertCount('refund_operations', 1)
  })

  test(
    'a sparse refund update received during a {earlierStatus} lookup is fetched by its queued job'
  )
    .with([{ earlierStatus: 'pending' as const }, { earlierStatus: 'failed' as const }])
    .run(async ({ client, assert }, { earlierStatus }) => {
      const provider = useFakeProvider()
      const { order } = await paidOrder(client, provider)
      provider.addRefund({
        id: 'ref_race',
        paymentId: 'pay_accepted',
        amount: orderTotalMinor,
        currency: 'PHP',
        status: earlierStatus,
      })
      const sparse = { type: 'refund.reconcile', refundId: 'ref_race' } as const
      await sendWebhook(client, provider, { ...sparse, id: 'evt_first' })
      const held = provider.holdNextCall('getRefund')
      const earlier = databaseWorker()
      const started = await earlier.processCycle(['payments'])
      assert.equal(started?.type, 'started')
      await held.reached

      provider.refunds.get('ref_race')!.status = 'succeeded'
      await sendWebhook(client, provider, { ...sparse, id: 'evt_second' })
      held.respond()
      await earlier.processCycle(['payments'])
      await runQueue(['payments'])

      const lookup = await RefundLookup.findByOrFail('externalId', 'ref_race')
      const observation = await RefundObservation.findByOrFail('externalId', 'ref_race')
      await order.refresh()
      assert.equal(lookup.state, 'resolved')
      assert.equal(observation.state, 'succeeded')
      assert.equal(order.financialStatus, 'refunded')
    })

  test('a processing refund is looked up again by the sweep without another webhook', async ({
    client,
    assert,
  }) => {
    const provider = useFakeProvider()
    const { order } = await paidOrder(client, provider)
    provider.addRefund({
      id: 'ref_processing',
      paymentId: 'pay_accepted',
      amount: orderTotalMinor,
      currency: 'PHP',
      status: 'pending',
    })
    await sendWebhook(client, provider, {
      id: 'evt_processing',
      type: 'refund.reconcile',
      refundId: 'ref_processing',
    })
    await runQueue(['payments'])
    const lookup = await RefundLookup.findByOrFail('externalId', 'ref_processing')
    assert.equal(lookup.state, 'pending')

    provider.refunds.get('ref_processing')!.status = 'succeeded'
    timeTravel(new Date(Date.now() + 5 * 60_000))
    await runSweep()
    await runQueue(['payments'])

    await lookup.refresh()
    await order.refresh()
    assert.equal(lookup.state, 'resolved')
    assert.equal(order.financialStatus, 'refunded')
  })

  test('a refund lookup that runs out of retries is left for operator review', async ({
    client,
    assert,
  }) => {
    const provider = useFakeProvider()
    await paidOrder(client, provider)
    provider.unavailable = true
    await sendWebhook(client, provider, {
      id: 'evt_sparse',
      type: 'refund.reconcile',
      refundId: 'ref_unreachable',
    })

    await runQueue(['payments'])
    for (let retry = 0; retry < 5; retry++) {
      passRetryDelay()
      await runQueue(['payments'])
    }

    const lookup = await RefundLookup.findByOrFail('externalId', 'ref_unreachable')
    assert.equal(lookup.state, 'review_required')
    assert.equal(lookup.lastError, 'E_REFUND_LOOKUP_RETRIES_EXHAUSTED')
  })
})

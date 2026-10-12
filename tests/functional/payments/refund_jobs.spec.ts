import { test } from '@japa/runner'
import RefundLookup from '#models/payments/refund_lookup'
import RefundOperation from '#models/payments/refund_operation'
import { UserFactory } from '#database/factories/user_factory'
import FakePaymentAdapter from '#tests/helpers/fake_payment_adapter'
import { databaseWorker, passRetryDelay, runQueue } from '#tests/helpers/queue'
import {
  orderTotalMinor,
  paidOrder,
  resetCheckoutState,
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
})

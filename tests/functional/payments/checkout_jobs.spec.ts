import { test, timeTravel } from '@japa/runner'
import Payment from '#models/payments/payment'
import { abandonNextJob, passRetryDelay, runQueue } from '#tests/helpers/queue'
import {
  paidOrder,
  awaitingPayment,
  checkoutOpened,
  orderTotalMinor,
  resetCheckoutState,
  sendWebhook,
  useFakeProvider,
} from '#tests/helpers/payments'

test.group('Payment checkout jobs', (group) => {
  group.each.setup(() => resetCheckoutState())

  test('a submitted checkout gets a provider checkout once the payments queue runs', async ({
    assert,
  }) => {
    const provider = useFakeProvider()
    const { attempt } = await awaitingPayment()

    await runQueue(['payments'])

    await attempt.refresh()
    assert.equal(attempt.state, 'pending')
    assert.isNotNull(attempt.externalId)
    assert.equal(attempt.checkoutUrl, provider.sessions.get(attempt.externalId!)!.url)
  })

  test('a lost provider response is recovered by replaying the same key, and stock is used once', async ({
    client,
    assert,
  }) => {
    const provider = useFakeProvider()
    const { order, attempt, variant } = await awaitingPayment()
    provider.loseCheckoutResponse = true

    await runQueue(['payments'])
    passRetryDelay()
    await runQueue(['payments'])

    await attempt.refresh()
    assert.equal(attempt.state, 'pending')
    assert.equal(provider.sessions.size, 1)
    assert.lengthOf(new Set(provider.calls.filter((call) => call.startsWith('create:'))), 1)
    provider.capture(attempt.externalId!, { id: 'pay_1', amount: orderTotalMinor })
    await sendWebhook(client, provider, {
      id: 'evt_paid',
      type: 'checkout.paid',
      checkoutId: attempt.externalId!,
    })
    await order.refresh()
    await variant.refresh()
    assert.equal(order.lifecycleState, 'confirmed')
    assert.equal(variant.inventoryQuantity, 0)
  })

  test("replaying stops after the provider's window, and the stock holds stay", async ({
    assert,
  }) => {
    const provider = useFakeProvider()
    const { attempt, variant } = await awaitingPayment()
    provider.loseCheckoutResponse = true
    await runQueue(['payments'])

    timeTravel(new Date(Date.now() + provider.mutationReplayWindowMs + 60_000))
    await runQueue(['payments'])

    await attempt.refresh()
    await variant.refresh()
    assert.isTrue(attempt.needsReview)
    assert.equal(attempt.lastError, 'E_PAYMENT_REPLAY_UNSAFE')
    assert.lengthOf(provider.calls, 1)
    assert.equal(variant.inventoryReservedQuantity, 2)
  })

  test('an uncertain closure keeps the holds, then expires the checkout once', async ({
    assert,
  }) => {
    const provider = useFakeProvider()
    const { order, attempt, variant } = await checkoutOpened()
    provider.unavailable = true
    timeTravel(new Date(attempt.expiresAtMs + 1000))

    await runQueue(['payments'])
    await variant.refresh()
    assert.equal(variant.inventoryReservedQuantity, 2)

    provider.unavailable = false
    passRetryDelay()
    await runQueue(['payments'])

    await order.refresh()
    await variant.refresh()
    assert.equal(order.lifecycleState, 'expired')
    assert.equal(variant.inventoryQuantity, 2)
    assert.equal(variant.inventoryReservedQuantity, 0)
    assert.lengthOf(
      provider.calls.filter((call) => call.startsWith('expire:')),
      1
    )
  })

  test('a checkout job that runs out of retries puts the attempt up for review and keeps the holds', async ({
    assert,
  }) => {
    const provider = useFakeProvider()
    const { attempt, variant } = await awaitingPayment()
    provider.unavailable = true

    await runQueue(['payments'])
    for (let retry = 0; retry < 5; retry++) {
      passRetryDelay()
      await runQueue(['payments'])
    }

    await attempt.refresh()
    await variant.refresh()
    assert.isTrue(attempt.needsReview)
    assert.equal(attempt.lastError, 'E_PAYMENT_RETRIES_EXHAUSTED')
    assert.equal(variant.inventoryReservedQuantity, 2)
  })

  test('a job left behind by a crashed worker is picked up again', async ({ assert }) => {
    const provider = useFakeProvider()
    const { attempt } = await awaitingPayment()
    await abandonNextJob('payments')

    await runQueue(['payments'])

    await attempt.refresh()
    assert.equal(attempt.state, 'pending')
    assert.equal(provider.sessions.size, 1)
  })

  test('the delayed expiry does nothing once the order is paid', async ({ client, assert }) => {
    const provider = useFakeProvider()
    const { order, attempt, variant } = await paidOrder(client, provider)

    timeTravel(new Date(attempt.expiresAtMs + 1000))
    await runQueue(['payments'])

    await order.refresh()
    await variant.refresh()
    assert.equal(order.lifecycleState, 'confirmed')
    assert.equal(variant.inventoryQuantity, 0)
    assert.isEmpty(provider.calls.filter((call) => call.startsWith('expire:')))
  })

  test('a capture for a checkout the store never heard back about is kept unassigned', async ({
    client,
    assert,
  }) => {
    const provider = useFakeProvider()
    await awaitingPayment()
    provider.loseCheckoutResponse = true
    await runQueue(['payments'])
    const [checkoutId] = provider.sessions.keys()
    provider.sessions.get(checkoutId)!.metadata = {}
    provider.capture(checkoutId, { id: 'pay_orphan', amount: orderTotalMinor })

    await sendWebhook(client, provider, { id: 'evt_orphan', type: 'checkout.paid', checkoutId })

    const payment = await Payment.findByOrFail('externalId', 'pay_orphan')
    assert.isNull(payment.orderId)
  })

  test('recovery binds an unassigned capture to its order and uses the stock once', async ({
    client,
    assert,
    db,
  }) => {
    const provider = useFakeProvider()
    const { order, variant } = await awaitingPayment()
    provider.loseCheckoutResponse = true
    await runQueue(['payments'])
    const [checkoutId] = provider.sessions.keys()
    provider.sessions.get(checkoutId)!.metadata = {}
    provider.capture(checkoutId, { id: 'pay_orphan', amount: orderTotalMinor })
    const paid = { id: 'evt_orphan', type: 'checkout.paid', checkoutId } as const
    await sendWebhook(client, provider, paid)

    passRetryDelay()
    await runQueue(['payments'])
    await sendWebhook(client, provider, paid)

    const payment = await Payment.findByOrFail('externalId', 'pay_orphan')
    await order.refresh()
    await variant.refresh()
    assert.equal(payment.orderId, order.id)
    assert.equal(payment.disposition, 'accepted')
    assert.equal(order.financialStatus, 'paid')
    assert.equal(variant.inventoryQuantity, 0)
    await db.assertCount('payments', 1)
  })
})

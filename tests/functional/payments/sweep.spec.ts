import { test, timeTravel } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'
import Cart from '#models/checkout/cart'
import DiscountCode from '#models/checkout/discount_code'
import RefundLookup from '#models/payments/refund_lookup'
import RefundOperation from '#models/payments/refund_operation'
import OrderNotification from '#mails/checkout/order_notification'
import { UserFactory } from '#database/factories/user_factory'
import { databaseWorker, loseQueuedJobs, queuedJobs, runQueue } from '#tests/helpers/queue'
import {
  awaitingPayment,
  checkoutOpened,
  orderTotalMinor,
  paidOrder,
  resetCheckoutState,
  runSweep,
  sendWebhook,
  useFakeProvider,
} from '#tests/helpers/payments'
import { urlFor } from '@adonisjs/core/services/url_builder'

/** Moves the clock past every sweep's one-minute staleness threshold. */
function waitUntilStale() {
  timeTravel(new Date(Date.now() + 5 * 60_000))
}

test.group('Payment operations sweep', (group) => {
  group.each.setup(() => resetCheckoutState())

  test('a stalled unpaid order past its payment window is closed, and its stock and discount use are returned', async ({
    assert,
  }) => {
    useFakeProvider()
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
    const { order, attempt, variant } = await checkoutOpened({ discountCode: 'SAVE10' })
    await loseQueuedJobs()
    timeTravel(new Date(attempt.expiresAtMs + 5 * 60_000))

    await runSweep()
    await runQueue(['payments'])

    await order.refresh()
    await variant.refresh()
    await code.refresh()
    assert.equal(order.lifecycleState, 'expired')
    assert.equal(variant.inventoryReservedQuantity, 0)
    assert.equal(code.timesUsed, 0)
    const cart = await Cart.findOrFail(order.cartId)
    assert.equal(cart.status, 'abandoned')
  })

  test('a stalled attempt still inside its payment window is reconciled, so a missed payment settles', async ({
    assert,
  }) => {
    const provider = useFakeProvider()
    const { order, attempt } = await checkoutOpened()
    await loseQueuedJobs()
    waitUntilStale()
    provider.capture(attempt.externalId!, { id: 'pay_missed', amount: orderTotalMinor })

    await runSweep()
    await runQueue(['payments'])

    await order.refresh()
    assert.equal(order.lifecycleState, 'confirmed')
    assert.equal(order.financialStatus, 'paid')
  })

  test('recent attempts, attempts claimed by a worker and attempts waiting on staff review are left alone', async ({
    assert,
  }) => {
    const provider = useFakeProvider()
    // Waiting on staff review: its lost provider response can no longer be replayed safely.
    const flagged = await awaitingPayment()
    provider.loseCheckoutResponse = true
    await runQueue(['payments'])
    timeTravel(new Date(Date.now() + provider.mutationReplayWindowMs + 60_000))
    await runQueue(['payments'])
    await flagged.attempt.refresh()
    assert.isTrue(flagged.attempt.needsReview)
    // Claimed: a reconciliation is still waiting on the provider when the attempt goes stale.
    const claimed = await checkoutOpened()
    await loseQueuedJobs()
    waitUntilStale()
    await runSweep()
    const held = provider.holdNextCall('getCheckout')
    const busy = databaseWorker()
    const started = await busy.processCycle(['payments'])
    assert.equal(started?.type, 'started')
    await held.reached
    timeTravel(new Date(Date.now() + 90_000))
    // Recent: its checkout opened moments ago.
    await checkoutOpened()
    await loseQueuedJobs()

    await runSweep()

    assert.isEmpty(await queuedJobs('payments'))
    held.fail()
    await busy.processCycle(['payments'])
    await claimed.attempt.refresh()
    assert.isFalse(claimed.attempt.needsReview)
  })

  test('stalled refunds, lookups and notifications are queued again', async ({
    client,
    assert,
  }) => {
    using mails = mail.fake()
    const provider = useFakeProvider()
    const { order } = await paidOrder(client, provider)
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    await client
      .post(urlFor('seller.refunds.store', { id: order.id }))
      .loginAs(staff)
      .withCsrfToken()
      .redirects(0)
    provider.addRefund({
      id: 'ref_dashboard',
      paymentId: 'pay_other',
      amount: 100,
      currency: 'PHP',
      status: 'succeeded',
    })
    await sendWebhook(client, provider, {
      id: 'evt_sparse',
      type: 'refund.reconcile',
      refundId: 'ref_dashboard',
    })
    await loseQueuedJobs()
    waitUntilStale()

    await runSweep()
    await runQueue(['payments', 'notifications'])

    const refund = await RefundOperation.findByOrFail('orderId', order.id)
    assert.equal(refund.state, 'pending')
    const lookup = await RefundLookup.findByOrFail('externalId', 'ref_dashboard')
    assert.equal(lookup.state, 'resolved')
    mails.mails.assertSentCount(OrderNotification, 1)
  })

  test('a lost notification is queued again only once per window', async ({ client, assert }) => {
    const provider = useFakeProvider()
    await paidOrder(client, provider)
    await loseQueuedJobs()
    waitUntilStale()

    await runSweep()
    await runSweep()

    const jobs = await queuedJobs('notifications')
    assert.deepEqual(
      jobs.map((job) => job.name),
      ['SendNotification']
    )
  })
})

import { test, timeTravel } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'
import Notification from '#models/checkout/notification'
import OrderNotification from '#mails/checkout/order_notification'
import { failMailDelivery } from '#tests/helpers/mail'
import { passRetryDelay, queuedJobs, runQueue } from '#tests/helpers/queue'
import { paidOrder, resetCheckoutState, runSweep, useFakeProvider } from '#tests/helpers/payments'

test.group('Order notifications', (group) => {
  group.each.setup(() => resetCheckoutState())

  test('the order notification job emails the customer', async ({ client }) => {
    using mails = mail.fake()
    await paidOrder(client, useFakeProvider())

    await runQueue(['notifications'])

    mails.mails.assertSent(OrderNotification, (sent) => sent.message.hasTo('guest@example.com'))
  })

  test('a mail delivery failure marks the notification failed and leaves the job to retry', async ({
    client,
    assert,
  }) => {
    await failMailDelivery()
    const { order } = await paidOrder(client, useFakeProvider())

    await runQueue(['notifications'])

    const notification = await Notification.findByOrFail('orderId', order.id)
    assert.equal(notification.state, 'failed')
    assert.equal(notification.lastError, 'E_NOTIFICATION_DELIVERY')
    const jobs = await queuedJobs('notifications')
    assert.deepEqual(
      jobs.map((job) => job.name),
      ['SendNotification']
    )
  })

  test('once mail works again, the retry sends exactly one email', async ({ client, assert }) => {
    const delivery = await failMailDelivery()
    const { order } = await paidOrder(client, useFakeProvider())
    await runQueue(['notifications'])
    await delivery.restore()
    using mails = mail.fake()

    passRetryDelay(5)
    await runQueue(['notifications'])

    mails.mails.assertSentCount(OrderNotification, 1)
    const notification = await Notification.findByOrFail('orderId', order.id)
    assert.equal(notification.state, 'sent')
  })

  test('a notification that runs out of retries stays failed for staff, and the sweep does not queue it again', async ({
    client,
    assert,
  }) => {
    await failMailDelivery()
    const { order } = await paidOrder(client, useFakeProvider())
    await runQueue(['notifications'])
    for (let retry = 0; retry < 5; retry++) {
      passRetryDelay(5)
      await runQueue(['notifications'])
    }

    timeTravel(new Date(Date.now() + 5 * 60_000))
    await runSweep()

    const notification = await Notification.findByOrFail('orderId', order.id)
    assert.equal(notification.lastError, 'E_NOTIFICATION_RETRIES_EXHAUSTED')
    assert.isEmpty(await queuedJobs('notifications'))
  })
})

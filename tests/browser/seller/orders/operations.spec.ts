import { test } from '@japa/runner'
import { QueueManager } from '@adonisjs/queue'
import FakePaymentAdapter from '#tests/helpers/fake_payment_adapter'
import { resetCheckoutState, useFakeProvider } from '#tests/helpers/payments'
import { setupConfirmedOrder, setupOrderEmail } from '#tests/helpers/orders'

test.group('Staff order operations', (group) => {
  group.each.setup(async () => {
    const reset = await resetCheckoutState()
    QueueManager.fake()
    return async () => {
      QueueManager.restore()
      await reset()
    }
  })

  test('retrying a failed email from the alert queues it again and clears the alert', async ({
    visit,
    browserContext,
    route,
    db,
  }) => {
    const adapter = useFakeProvider([new FakePaymentAdapter('order-operations-page')])
    const { order, staff } = await setupConfirmedOrder({ adapter })
    const email = await setupOrderEmail(order, { kind: 'shipment', state: 'failed' })
    await browserContext.loginAs(staff)
    const page = await visit(route('seller.orders.show', { id: order.id }))
    const notice = page.getByText('Shipment email failed', { exact: true })
    await page
      .getByRole('alert')
      .filter({ has: notice })
      .getByRole('button', { name: 'Retry shipment email', exact: true })
      .click()
    await page.assertNotExists(notice)
    const entry = page
      .getByRole('region', { name: 'Order activity', exact: true })
      .getByRole('listitem')
      .filter({ has: page.locator('[data-timeline-title]', { hasText: /^Shipment email$/ }) })
    await page.assertVisible(entry.getByText('Queued', { exact: true }))
    await db.assertHas('order_notifications', { id: email.id, state: 'pending' })
  })
})

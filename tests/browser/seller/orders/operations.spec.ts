import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { QueueManager } from '@adonisjs/queue'
import PaymentService from '#services/payments/payment_service'
import DispatcherService from '#services/payments/dispatcher_service'
import FakePaymentAdapter from '#tests/helpers/fake_payment_adapter'
import { resetCheckoutState } from '#tests/helpers/payments'
import { setupConfirmedOrder, setupOrderEmail } from '#tests/helpers/orders'

test.group('Staff order operations', (group) => {
  let adapter: FakePaymentAdapter
  group.each.setup(async () => {
    const reset = await resetCheckoutState()
    adapter = new FakePaymentAdapter('order-operations-page')
    app.container.swap(PaymentService, () => new DispatcherService(adapter.provider, [adapter]))
    QueueManager.fake()
    return async () => {
      QueueManager.restore()
      app.container.restore(PaymentService)
      await reset()
    }
  })

  test('retrying a failed email from the alert queues it again and clears the alert', async ({
    visit,
    browserContext,
    route,
    db,
  }) => {
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
      .getByRole('region', { name: 'Order activity' })
      .getByRole('listitem')
      .filter({ has: page.locator('[data-timeline-title]', { hasText: /^Shipment email$/ }) })
    await page.assertVisible(entry.getByText('Queued', { exact: true }))
    await db.assertHas('order_notifications', { id: email.id, state: 'pending' })
  })
})

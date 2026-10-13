import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { QueueManager } from '@adonisjs/queue'
import PaymentService from '#services/payments/payment_service'
import DispatcherService from '#services/payments/dispatcher_service'
import Payment from '#models/payments/payment'
import FakePaymentAdapter from '#tests/helpers/fake_payment_adapter'
import { resetCheckoutState } from '#tests/helpers/payments'
import { setupConfirmedOrder } from '#tests/helpers/orders'

test.group('Staff order refunds', (group) => {
  let adapter: FakePaymentAdapter
  group.each.setup(async () => {
    const reset = await resetCheckoutState()
    adapter = new FakePaymentAdapter('order-refunds')
    app.container.swap(PaymentService, () => new DispatcherService(adapter.provider, [adapter]))
    QueueManager.fake()
    return async () => {
      QueueManager.restore()
      app.container.restore(PaymentService)
      await reset()
    }
  })

  test('with two refundable payments, staff choose which payment to refund', async ({
    visit,
    browserContext,
    route,
    assert,
    db,
  }) => {
    const { order, staff, extraPayment } = await setupConfirmedOrder({
      adapter,
      extraPayment: true,
    })
    const first = await Payment.query()
      .where('orderId', order.id)
      .whereNot('id', extraPayment!.id)
      .firstOrFail()
    await browserContext.loginAs(staff)
    const page = await visit(route('seller.orders.show', { id: order.id }))
    await page.getByRole('button', { name: 'More actions', exact: true }).click()
    await page.getByRole('menuitem', { name: /^Refund/ }).click()
    const choices = page.getByRole('dialog').getByRole('radio')
    await page.assertVisible(choices.first())
    assert.equal(await choices.count(), 2)
    const second = page.getByRole('radio', { name: new RegExp(extraPayment!.externalId) })
    await page.assertVisible(second)
    await page.assertVisible(
      page.getByRole('dialog').getByText(/₱100\.00 remaining/, { exact: false })
    )
    await second.check()
    await page
      .getByRole('checkbox', { name: /^I confirm refunding ₱100\.00 to this payment\.$/ })
      .check()
    await page.getByRole('button', { name: 'Request refund of ₱100.00', exact: true }).click()
    await page.assertNotVisible(page.getByRole('dialog'))
    await db.assertHas('refund_operations', { order_id: order.id, payment_id: extraPayment!.id }, 1)
    await db.assertMissing('refund_operations', { payment_id: first.id })
  })
})

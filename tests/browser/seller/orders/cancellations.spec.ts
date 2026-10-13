import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { QueueManager } from '@adonisjs/queue'
import PaymentService from '#services/payments/payment_service'
import DispatcherService from '#services/payments/dispatcher_service'
import Payment from '#models/payments/payment'
import RefundObservation from '#models/payments/refund_observation'
import StockReservation from '#models/checkout/stock_reservation'
import FakePaymentAdapter from '#tests/helpers/fake_payment_adapter'
import { resetCheckoutState } from '#tests/helpers/payments'
import { setupConfirmedOrder } from '#tests/helpers/orders'
import { simulatedCheckout } from '#tests/helpers/simulated_checkout'
import { UserFactory } from '#database/factories/user_factory'
import { ProductVariantFactory } from '#database/factories/product_variant_factory'

test.group('Staff order cancellations', (group) => {
  let adapter: FakePaymentAdapter
  group.each.setup(async () => {
    const reset = await resetCheckoutState()
    adapter = new FakePaymentAdapter('order-cancellations')
    app.container.swap(PaymentService, () => new DispatcherService(adapter.provider, [adapter]))
    QueueManager.fake()
    return async () => {
      QueueManager.restore()
      app.container.restore(PaymentService)
      await reset()
    }
  })

  test('cancelling a paid order shows its consequences and requires confirmation', async ({
    visit,
    browserContext,
    route,
    assert,
    db,
  }) => {
    const { order, staff } = await setupConfirmedOrder({ adapter })
    // The checkout consumed one unit; a second line's unit makes two to return.
    const variant = await ProductVariantFactory.create()
    await StockReservation.create({
      orderId: order.id,
      productVariantId: variant.id,
      quantity: 1,
      state: 'consumed',
      expiresAtMs: Date.now(),
    })
    await browserContext.loginAs(staff)
    const page = await visit(route('seller.orders.show', { id: order.id }))
    await page.getByRole('button', { name: 'More actions', exact: true }).click()
    await page.getByRole('menuitem', { name: /^Cancel order/ }).click()
    const dialog = page.getByRole('dialog')
    await page.assertVisible(dialog.getByText('Returns 2 units to stock.', { exact: true }))
    await page.assertVisible(
      dialog.getByText(/^Requests a ₱.+ It stays pending until the provider confirms it\.$/)
    )
    const submit = dialog.getByRole('button', { name: /^Cancel and refund ₱/ })
    assert.isTrue(await submit.isDisabled())
    await dialog
      .getByRole('checkbox', { name: /^I confirm cancelling this order and refunding ₱.+\.$/ })
      .check()
    await submit.click()
    await page.assertVisible(
      page.getByText(
        'Order cancelled. Any required refund is queued and awaits provider confirmation.',
        { exact: true }
      )
    )
    await page.assertVisible(page.getByRole('heading', { name: 'Order cancelled', exact: true }))
    await db.assertHas('orders', { id: order.id, lifecycle_state: 'cancelled' })
  })

  test('cancelling an unpaid checkout leaves Cancel order unavailable while the request is pending', async ({
    visit,
    browserContext,
    route,
    assert,
  }) => {
    const { order } = await simulatedCheckout()
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    await browserContext.loginAs(staff)
    const page = await visit(route('seller.orders.show', { id: order.id }))
    await page.getByRole('button', { name: 'More actions', exact: true }).click()
    await page.getByRole('menuitem', { name: /^Cancel order/ }).click()
    const dialog = page.getByRole('dialog')
    await dialog
      .getByRole('checkbox', { name: 'I confirm cancelling this order.', exact: true })
      .check()
    await dialog.getByRole('button', { name: 'Cancel order', exact: true }).click()
    await page.assertVisible(
      page.getByText(
        'Cancellation requested. Stock stays held until the checkout is confirmed closed.',
        { exact: true }
      )
    )
    await page.getByRole('button', { name: 'More actions', exact: true }).click()
    assert.isTrue(await page.getByRole('menuitem', { name: /^Cancel order/ }).isDisabled())
    await page.assertVisible(
      page.getByText(
        'Cancellation is already requested. Refresh status to check the confirmed outcome.',
        { exact: true }
      )
    )
  })

  test('Cancel order is unavailable and says why: {reason}')
    .with([
      { stage: 'shipped' as const, reason: 'Orders can’t be cancelled after they ship.' },
      {
        providerRefund: true,
        reason: 'Reconcile the provider refund before cancelling this order.',
      },
    ])
    .run(async ({ visit, browserContext, route, assert }, row) => {
      const { order, staff } = await setupConfirmedOrder({
        adapter,
        stage: 'stage' in row ? row.stage : undefined,
      })
      if ('providerRefund' in row) {
        const payment = await Payment.findByOrFail('orderId', order.id)
        await RefundObservation.create({
          provider: payment.provider,
          liveMode: payment.liveMode,
          externalId: 'external-provider-refund',
          externalPaymentId: payment.externalId,
          amountMinor: payment.amountMinor,
          currency: 'PHP',
          state: 'pending',
        })
      }
      await browserContext.loginAs(staff)
      const page = await visit(route('seller.orders.show', { id: order.id }))
      await page.getByRole('button', { name: 'More actions', exact: true }).click()
      assert.isTrue(await page.getByRole('menuitem', { name: /^Cancel order/ }).isDisabled())
      await page.assertVisible(page.getByText(row.reason, { exact: true }))
    })
})

import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { QueueManager } from '@adonisjs/queue'
import { mkdir } from 'node:fs/promises'
import { DateTime } from 'luxon'
import PaymentService from '#services/payments/payment_service'
import DispatcherService from '#services/payments/dispatcher_service'
import SettlementService from '#services/payments/settlement_service'
import FulfillmentService from '#services/checkout/fulfillment_service'
import RefundObservation from '#models/payments/refund_observation'
import RefundOperation from '#models/payments/refund_operation'
import Payment from '#models/payments/payment'
import Shipment from '#models/checkout/shipment'
import FakePaymentAdapter from '../helpers/fake_payment_adapter.js'
import { simulatedCheckout } from '../helpers/simulated_checkout.js'
import { UserFactory } from '../../database/factories/user_factory.js'
import { OrderFactory } from '../../database/factories/order_factory.js'

test.group('Staff order hardening', (group) => {
  let adapter: FakePaymentAdapter
  group.each.setup(async () => {
    const truncate = await testUtils.db().truncate()
    adapter = new FakePaymentAdapter('order-hardening')
    app.container.swap(PaymentService, () => new DispatcherService(adapter.provider, [adapter]))
    QueueManager.fake()
    return async () => {
      QueueManager.restore()
      app.container.restore(PaymentService)
      await truncate()
    }
  })

  async function confirmedOrder() {
    const { order, attempt } = await simulatedCheckout()
    const checkout = adapter.sessions.get(attempt.externalId!)!
    checkout.status = 'paid'
    checkout.payments = [
      { id: `capture-${order.id}`, amount: order.totalMinor!, currency: 'PHP', status: 'paid' },
    ]
    const settlement = await app.container.make(SettlementService)
    await settlement.apply(checkout)
    await order.refresh()
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    return { order, staff }
  }

  test('long and multilingual records fit desktop, tablet and mobile; provider refunds block dispatch', async ({
    visit,
    browserContext,
    assert,
  }) => {
    const { order, staff } = await confirmedOrder()
    order.number = 'MB-' + 'A'.repeat(64)
    order.email = 'long-customer-name.' + 'b'.repeat(64) + '@example.com'
    await order.save()
    const item = await order.related('lineItems').query().firstOrFail()
    item.title = '特別な商品 العربية 🎁 ' + 'LongProductName'.repeat(12)
    item.variantTitle = 'Very long variant ' + 'C'.repeat(100)
    item.sku = 'SKU-' + 'D'.repeat(150)
    await item.save()
    const address = await order.related('addresses').query().firstOrFail()
    address.address1 = '東京都 العربية ' + 'AddressWithoutSpaces'.repeat(8)
    await address.save()
    await browserContext.loginAs(staff)
    const page = await visit(`/seller/orders/${order.id}`)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.getByRole('heading', { name: 'Ready to pack', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Accept', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Accept', exact: true }).click()
    const actionColors = await page.evaluate<{
      fill: number[]
      label: number[]
      link: number[]
      ground: number[]
    }>(`(() => {
      const rgb = (value) => {
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 1
        const context = canvas.getContext('2d')
        context.fillStyle = value
        context.fillRect(0, 0, 1, 1)
        return Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3)
      }
      const button = Array.from(document.querySelectorAll('button')).find(element => element.textContent.trim() === 'Start packing')
      const link = Array.from(document.querySelectorAll('a')).filter(element => element.textContent.trim() === 'Orders').at(-1)
      const style = getComputedStyle(button)
      return {
        fill: rgb(style.backgroundColor),
        label: rgb(style.color),
        link: rgb(getComputedStyle(link).color),
        ground: rgb(style.getPropertyValue('--ui-bg')),
      }
    })()`)
    const luminance = (rgb: number[]) =>
      rgb
        .map((value) => value / 255)
        .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
        .reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0)
    const contrast = (a: number[], b: number[]) => {
      const values = [luminance(a), luminance(b)].sort((x, y) => y - x)
      return (values[0] + 0.05) / (values[1] + 0.05)
    }
    assert.isAtLeast(contrast(actionColors.label, actionColors.fill), 4.5)
    assert.isAtLeast(contrast(actionColors.link, actionColors.ground), 4.5)
    await mkdir('.impeccable/review', { recursive: true })
    const scrollTop = () =>
      page.evaluate(`(() => {
        document.querySelectorAll('*').forEach(element => {
          if (element instanceof HTMLElement) element.scrollTop = 0
        })
        window.scrollTo(0, 0)
      })()`)
    for (const viewport of [
      { width: 1280, height: 900, file: 'desktop.png' },
      { width: 768, height: 1024, file: 'tablet.png' },
      { width: 390, height: 844, file: 'mobile.png' },
    ]) {
      await page.setViewportSize(viewport)
      await scrollTop()
      assert.isTrue(
        await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
      )
      await page.screenshot({ path: `.impeccable/review/${viewport.file}`, fullPage: true })
      await page
        .getByRole('heading', { name: 'Order contents', exact: true })
        .scrollIntoViewIfNeeded()
      const itemTitle = page.getByText(item.title, { exact: true })
      await (viewport.width >= 640 ? itemTitle.first() : itemTitle.last()).waitFor({
        state: 'visible',
      })
      assert.isTrue(
        await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
      )
      await page.screenshot({ path: `.impeccable/review/details-${viewport.file}`, fullPage: true })
      await page
        .getByRole('heading', { name: 'Ready to pack', exact: true })
        .scrollIntoViewIfNeeded()
    }
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.setViewportSize({ width: 1280, height: 900 })
    await scrollTop()
    await page.screenshot({ path: '.impeccable/review/dark-desktop.png', fullPage: true })
    await page.emulateMedia({ colorScheme: 'light' })
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
    await page.getByRole('button', { name: 'Refresh status', exact: true }).click()
    await page
      .getByRole('heading', { name: 'The provider reported a refund', exact: true })
      .waitFor()
    await page.getByRole('link', { name: 'Go to refund records', exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Start packing', exact: true }).count(), 0)
    await page
      .getByText('A refund is already in progress for this payment.', { exact: true })
      .waitFor()
    for (const viewport of [
      { width: 1280, height: 900, file: 'recovery-desktop.png' },
      { width: 390, height: 844, file: 'recovery-mobile.png' },
    ]) {
      await page.setViewportSize(viewport)
      await scrollTop()
      assert.isTrue(
        await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
      )
      await page.screenshot({ path: `.impeccable/review/${viewport.file}`, fullPage: true })
    }
    assert.isEmpty(errors)
  })

  test('a lost action response locks mutations until refresh and preserves shipment input on validation errors', async ({
    visit,
    browserContext,
    assert,
  }) => {
    const { order, staff } = await confirmedOrder()
    await browserContext.loginAs(staff)
    const page = await visit(`/seller/orders/${order.id}`)
    await page.getByRole('heading', { name: 'Ready to pack', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Accept', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Accept', exact: true }).click()
    await page.route(`**/seller/orders/${order.id}/packing`, (request) => request.abort('failed'))
    await page.getByRole('button', { name: 'Start packing', exact: true }).click()
    await page
      .getByRole('alert')
      .getByText('Check status before continuing', { exact: true })
      .waitFor()
    assert.isTrue(
      await page.getByRole('button', { name: 'Start packing', exact: true }).isDisabled()
    )
    await page.unroute(`**/seller/orders/${order.id}/packing`)
    await page
      .getByRole('alert')
      .getByRole('button', { name: 'Refresh status', exact: true })
      .click()
    await page.getByRole('button', { name: 'Start packing', exact: true }).click()
    await page.getByRole('heading', { name: 'Ready to dispatch', exact: true }).waitFor()
    // The packing button disappears; focus continues in the dispatch form.
    assert.equal(await page.evaluate('document.activeElement?.getAttribute("name")'), 'carrier')
    await page
      .getByRole('status')
      .getByText('Packing started. Add the carrier and tracking number to record the shipment.')
      .waitFor({ state: 'attached' })
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.screenshot({ path: '.impeccable/review/dispatch-desktop.png', fullPage: true })
    await page.getByLabel('Carrier', { exact: true }).fill('  ')
    await page.getByLabel('Tracking number', { exact: true }).fill('KEEP-MY-TRACKING')
    await page.getByRole('button', { name: 'Mark as shipped', exact: true }).click()
    await page
      .getByRole('status')
      .getByText(/^One field needs attention\./)
      .waitFor({ state: 'attached' })
    await page.waitForFunction('document.activeElement?.getAttribute("name") === "carrier"')
    assert.equal(await page.getByRole('alert').count(), 0)
    assert.equal(
      await page.getByLabel('Tracking number', { exact: true }).inputValue(),
      'KEEP-MY-TRACKING'
    )
    const shipment = await Shipment.findByOrFail('orderId', order.id)
    assert.equal(shipment.state, 'packing')
    await page.getByText('Order is being packed', { exact: true }).waitFor({ state: 'hidden' })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: '.impeccable/review/error-mobile.png', fullPage: true })
  })

  test('refunds require acknowledgement and a repeated click creates one durable operation', async ({
    visit,
    browserContext,
    assert,
  }) => {
    const { order, staff } = await confirmedOrder()
    await browserContext.loginAs(staff)
    const page = await visit(`/seller/orders/${order.id}`)
    await page.getByText('Refund this payment', { exact: true }).click()
    const button = page.getByRole('button', { name: /^Request refund of ₱/ })
    assert.isTrue(await button.isDisabled())
    await page
      .getByRole('checkbox', { name: /^I confirm refunding ₱.+ to this payment\.$/ })
      .check()
    await button.click({ clickCount: 2 })
    await page
      .getByText('A refund is already in progress for this payment.', { exact: true })
      .waitFor()
    assert.lengthOf(await RefundOperation.query().where('orderId', order.id), 1)
  })

  test('empty manual orders remain editable and unsafe historical tracking links are not rendered', async ({
    visit,
    browserContext,
    assert,
  }) => {
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    const order = await OrderFactory.create()
    await browserContext.loginAs(staff)
    const page = await visit(`/seller/orders/${order.id}`)
    await page.getByText('No items are recorded for this order.', { exact: true }).waitFor()
    await page.getByLabel('Note', { exact: true }).fill('Keep this draft note.')
    await page.getByRole('button', { name: 'Save changes', exact: true }).click()
    await page.getByText('Order updated', { exact: true }).waitFor()
    await order.refresh()
    assert.equal(order.note, 'Keep this draft note.')
    const confirmed = await confirmedOrder()
    const fulfillment = await app.container.make(FulfillmentService)
    await fulfillment.pack(confirmed.order.id, confirmed.staff)
    await fulfillment.ship(confirmed.order.id, confirmed.staff, {
      carrier: 'Sample Carrier',
      trackingNumber: 'SAFE-TRACKING',
    })
    const shipment = await Shipment.findByOrFail('orderId', confirmed.order.id)
    shipment.trackingUrl = 'javascript:alert(1)'
    await shipment.save()
    await page.goto(`/seller/orders/${confirmed.order.id}`)
    await page.getByRole('heading', { name: 'Shipment recorded', exact: true }).waitFor()
    assert.equal(await page.getByRole('link', { name: 'Track shipment', exact: true }).count(), 0)
  })

  test('captured payment and refund records retain their original currency', async ({
    visit,
    browserContext,
  }) => {
    const { order, staff } = await confirmedOrder()
    const payment = await Payment.create({
      orderId: order.id,
      provider: adapter.provider,
      liveMode: false,
      externalId: 'foreign-currency-capture',
      amountMinor: 15000,
      currency: 'USD',
      disposition: 'review_required',
      capturedAt: DateTime.utc(),
    })
    await RefundOperation.create({
      orderId: order.id,
      paymentId: payment.id,
      provider: payment.provider,
      liveMode: payment.liveMode,
      amountMinor: payment.amountMinor,
      reason: 'requested_by_customer',
      idempotencyKey: `foreign-refund-${order.id}`,
      state: 'pending',
      actorId: staff.id,
      needsReview: false,
      replayScope: 'resource',
    })
    order.lifecycleState = 'review_required'
    order.reviewReason = 'Review the additional captured payment.'
    await order.save()
    await browserContext.loginAs(staff)
    const page = await visit(`/seller/orders/${order.id}`)
    const amount = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'USD' }).format(
      150
    )
    await page.getByText(`Payment · ${amount}`, { exact: true }).waitFor()
    await page.getByText(`Refund · ${amount}`, { exact: true }).waitFor()
  })
})

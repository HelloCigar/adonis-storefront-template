import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { QueueManager } from '@adonisjs/queue'
import PaymentService from '#services/payments/payment_service'
import DispatcherService from '#services/payments/dispatcher_service'
import FakePaymentAdapter from '#tests/helpers/fake_payment_adapter'
import InventoryService from '#services/catalog/inventory_service'
import RecoveryService from '#services/payments/recovery_service'
import SettlementService from '#services/payments/settlement_service'
import StockReservation from '#models/checkout/stock_reservation'
import Order from '#models/checkout/order'
import Attempt from '#models/payments/attempt'
import Shipment from '#models/checkout/shipment'
import { ProductVariantFactory } from '#database/factories/product_variant_factory'
import { UserFactory } from '#database/factories/user_factory'
import Notification from '#models/checkout/notification'
import { simulatedCheckout } from '#tests/helpers/simulated_checkout'
import { mkdir } from 'node:fs/promises'

test.group('Guest checkout and store fulfillment', (group) => {
  let adapter: FakePaymentAdapter
  group.each.setup(async () => {
    const truncate = await testUtils.db().truncate()
    adapter = new FakePaymentAdapter('browser-sandbox')
    app.container.swap(PaymentService, () => new DispatcherService(adapter.provider, [adapter]))
    QueueManager.fake()
    return async () => {
      QueueManager.restore()
      app.container.restore(PaymentService)
      const inventory = await app.container.make(InventoryService)
      const loadedStockReservation1 = await StockReservation.query().where('state', 'reserved')
      for (const orderId of new Set(loadedStockReservation1.map((row) => row.orderId)))
        await db.transaction((trx) => inventory.release(trx, orderId))
      await truncate()
    }
  })

  test('a guest submits from the cart, pays, and staff dispatch through Inertia forms', async ({
    visit,
    browserContext,
    assert,
  }) => {
    const variant = await ProductVariantFactory.merge({
      priceAmount: 499,
      inventoryQuantity: 2,
    }).create()
    await variant.load('product')
    const page = await visit(`/product/${variant.product.handle}`)
    const errors: string[] = []
    const requests: { path: string; inertia?: string; navigation: boolean }[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('request', (request) => {
      if (
        ['/checkout', '/seller/orders'].some((path) =>
          new URL(request.url()).pathname.startsWith(path)
        )
      )
        requests.push({
          path: new URL(request.url()).pathname,
          inertia: request.headers()['x-inertia'],
          navigation: request.isNavigationRequest(),
        })
    })
    await page.getByRole('button', { name: 'Add to cart', exact: true }).click()
    await page.getByRole('button', { name: 'Open cart', exact: true }).click()
    await page.getByRole('button', { name: 'Checkout', exact: true }).click()
    await page.assertPath('/checkout')
    await page.getByRole('heading', { name: 'Checkout', exact: true }).waitFor()
    await page.getByLabel('Email address', { exact: true }).fill('browser@example.com')
    await page.getByLabel('First name', { exact: true }).fill('Guest')
    await page.getByLabel('Last name', { exact: true }).fill('Buyer')
    await page.getByLabel('Phone number', { exact: true }).fill('09171234567')
    await page.getByLabel('Street address', { exact: true }).fill('123 Sample Street')
    await page.getByLabel('City / municipality', { exact: true }).fill('Quezon City')
    await page.getByLabel('Province / region', { exact: true }).fill('Metro Manila')
    await page.getByLabel('Postal code', { exact: true }).fill('1100')
    await page.getByRole('button', { name: 'Continue to payment', exact: true }).click()
    await page.getByRole('heading', { name: 'Preparing your payment', exact: true }).waitFor()
    const order = await Order.firstOrFail()
    assert.isNull(order.userId)
    assert.equal(order.totalMinor, 59900)
    const attempt = await Attempt.findByOrFail('orderId', order.id)
    const recoveryService2 = await app.container.make(RecoveryService)
    await recoveryService2.run(attempt.id)
    await attempt.refresh()
    await page.getByRole('button', { name: 'Check payment', exact: true }).click()
    await page.getByRole('heading', { name: 'Your order is ready to pay', exact: true }).waitFor()
    const payLink = page.getByRole('link', { name: 'Pay now', exact: true })
    assert.equal(await payLink.getAttribute('href'), attempt.checkoutUrl)
    const session = adapter.sessions.get(attempt.externalId!)!
    session.status = 'paid'
    session.payments = [{ id: 'browser-capture', amount: 59900, currency: 'PHP', status: 'paid' }]
    const settlementService3 = await app.container.make(SettlementService)
    await settlementService3.apply(session)
    // Payment confirmation also arrives through the bounded status poll without a browser return.
    await page.getByRole('heading', { name: 'Payment received', exact: true }).waitFor()
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    await browserContext.loginAs(staff)
    await page.goto(`/seller/orders/${order.id}`)
    await page.getByRole('heading', { name: 'Pack items', exact: true }).waitFor()
    await page.waitForLoadState('networkidle')
    await mkdir('.impeccable/review', { recursive: true })
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.screenshot({ path: '.impeccable/review/desktop.png', fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    assert.isTrue(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
    await page.screenshot({ path: '.impeccable/review/mobile.png', fullPage: true })
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.getByRole('button', { name: 'Start packing', exact: true }).click()
    await page.getByRole('heading', { name: 'Add tracking', exact: true }).waitFor()
    await page.getByLabel('Carrier', { exact: true }).fill('Sample Carrier')
    await page.getByLabel('Tracking number', { exact: true }).fill('BROWSER-123')
    await page.getByLabel('Tracking URL', { exact: true }).fill('https://carrier.example/track/123')
    await page.getByRole('button', { name: 'Mark as shipped', exact: true }).click()
    await page.getByRole('heading', { name: 'Confirm delivery', exact: true }).waitFor()
    const shipment = await Shipment.findByOrFail('orderId', order.id)
    assert.equal(shipment.state, 'shipped')
    assert.equal(shipment.trackingNumber, 'BROWSER-123')
    await page.getByText('BROWSER-123', { exact: true }).waitFor()
    assert.equal(
      await page.getByRole('button', { name: 'Mark as shipped', exact: true }).count(),
      0
    )
    assert.isEmpty(errors)
    assert.isTrue(
      requests.some(
        (request) =>
          request.path === '/checkout' && request.inertia === 'true' && !request.navigation
      )
    )
    assert.isTrue(
      requests.some(
        (request) =>
          request.path.endsWith('/shipment') && request.inertia === 'true' && !request.navigation
      )
    )
    await page
      .getByRole('heading', { name: 'Order contents', exact: true })
      .scrollIntoViewIfNeeded()
    await page.screenshot({ path: '.impeccable/review/details-desktop.png', fullPage: true })
  })

  test('staff see dispatch blockers and can recover checkout and customer updates', async ({
    visit,
    browserContext,
    assert,
  }) => {
    const { order, attempt } = await simulatedCheckout()
    order.lifecycleState = 'review_required'
    order.reviewReason = 'Verify the original checkout before dispatch.'
    await order.save()
    attempt.state = 'unknown'
    attempt.needsReview = true
    attempt.lastError = 'The provider response could not be confirmed.'
    await attempt.save()
    const notification = await Notification.create({
      orderId: order.id,
      kind: 'receipt',
      state: 'failed',
      lastError: 'Email delivery could not be confirmed.',
    })
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    await browserContext.loginAs(staff)
    const page = await visit(`/seller/orders/${order.id}`)
    await page
      .getByRole('heading', { name: 'Reconcile the payment checkout', exact: true })
      .waitFor()
    await page.getByText(order.reviewReason).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Start packing', exact: true }).count(), 0)
    assert.equal(
      await page.getByRole('button', { name: 'Mark as shipped', exact: true }).count(),
      0
    )
    await page.getByRole('button', { name: 'Recheck payment with provider', exact: true }).waitFor()
    await page.waitForLoadState('networkidle')
    await mkdir('.impeccable/review', { recursive: true })
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.screenshot({ path: '.impeccable/review/recovery-desktop.png', fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    assert.isTrue(await page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
    await page.screenshot({ path: '.impeccable/review/recovery-mobile.png', fullPage: true })
    await page.getByRole('button', { name: 'Retry receipt', exact: true }).click()
    await page.getByText('Recovery requested', { exact: true }).waitFor()
    await notification.refresh()
    assert.equal(notification.state, 'pending')
    await page.getByRole('button', { name: 'Recheck payment with provider', exact: true }).click()
    await page.getByText('Recovery requested', { exact: true }).waitFor()
    await attempt.refresh()
    assert.isFalse(attempt.needsReview)
    await order.refresh()
    assert.equal(order.lifecycleState, 'review_required')
    await page.getByRole('button', { name: 'Add note', exact: true }).click()
    await page
      .getByLabel('Note', { exact: true })
      .fill('Verify with the original provider account.')
    await page.getByRole('button', { name: 'Save note', exact: true }).click()
    await page.getByText('Order updated', { exact: true }).waitFor()
    await order.refresh()
    assert.equal(order.note, 'Verify with the original provider account.')
    assert.equal(order.financialStatus, 'pending')
  })

  test('a signed-in customer reviews a changed quote before submitting the updated amount', async ({
    visit,
    browserContext,
    assert,
  }) => {
    const customer = await UserFactory.create()
    await browserContext.loginAs(customer)
    const variant = await ProductVariantFactory.merge({
      priceAmount: 499,
      inventoryQuantity: 2,
    }).create()
    await variant.load('product')
    const page = await visit(`/product/${variant.product.handle}`)
    await page.getByRole('button', { name: 'Add to cart', exact: true }).click()
    await page.getByRole('button', { name: 'Open cart', exact: true }).click()
    await page.getByRole('button', { name: 'Checkout', exact: true }).click()
    await page.assertPath('/checkout')
    await page.getByLabel('First name', { exact: true }).fill('Account')
    await page.getByLabel('Last name', { exact: true }).fill('Buyer')
    await page.getByLabel('Phone number', { exact: true }).fill('09171234567')
    await page.getByLabel('Street address', { exact: true }).fill('123 Sample Street')
    await page.getByLabel('City / municipality', { exact: true }).fill('Quezon City')
    await page.getByLabel('Province / region', { exact: true }).fill('Metro Manila')
    await page.getByLabel('Postal code', { exact: true }).fill('1100')
    variant.priceAmount = 550
    await variant.save()
    await page.getByRole('button', { name: 'Continue to payment', exact: true }).click()
    await page
      .getByText('Prices or availability changed. Review the updated quote.', { exact: true })
      .waitFor()
    assert.isEmpty(await Order.all())
    await page.getByRole('button', { name: 'Continue to payment', exact: true }).click()
    await page.getByRole('heading', { name: 'Preparing your payment', exact: true }).waitFor()
    const order = await Order.firstOrFail()
    assert.equal(order.userId, customer.id)
    assert.equal(order.totalMinor, 65000)
    await page.reload()
    await page.getByRole('heading', { name: 'Preparing your payment', exact: true }).waitFor()
  })
})

import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { QueueManager } from '@adonisjs/queue'
import PaymentService from '#services/payments/payment_service'
import DispatcherService from '#services/payments/dispatcher_service'
import FakePaymentAdapter from '#tests/helpers/fake_payment_adapter'
import InventoryService from '#services/catalog/inventory_service'
import StockReservation from '#models/checkout/stock_reservation'
import DiscountCode from '#models/checkout/discount_code'
import Order from '#models/checkout/order'
import { ProductVariantFactory } from '#database/factories/product_variant_factory'
import { UserFactory } from '#database/factories/user_factory'

test.group('Discount codes', (group) => {
  group.each.setup(async () => {
    const truncate = await testUtils.db().truncate()
    const adapter = new FakePaymentAdapter('browser-sandbox')
    app.container.swap(PaymentService, () => new DispatcherService(adapter.provider, [adapter]))
    QueueManager.fake()
    return async () => {
      QueueManager.restore()
      app.container.restore(PaymentService)
      const inventory = await app.container.make(InventoryService)
      const reserved = await StockReservation.query().where('state', 'reserved')
      for (const orderId of new Set(reserved.map((row) => row.orderId)))
        await db.transaction((trx) => inventory.release(trx, orderId))
      await truncate()
    }
  })

  test('staff create a code that a guest applies at checkout without losing their details', async ({
    visit,
    browserContext,
    assert,
    route,
  }) => {
    const variant = await ProductVariantFactory.merge({
      priceAmount: 499,
      inventoryQuantity: 2,
    }).create()
    await variant.load('product')
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    await browserContext.loginAs(staff)
    const admin = await visit(route('seller.discounts.index'))
    const errors: string[] = []
    admin.on('pageerror', (error) => errors.push(error.message))
    await admin.getByRole('button', { name: 'Add discount' }).first().click()
    const dialog = admin.getByRole('dialog')
    await dialog.getByLabel('Code').fill('welcome20')
    await dialog.getByLabel('Percent off').fill('20')
    await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    await admin.getByText('WELCOME20', { exact: true }).waitFor()
    await admin.screenshot({ path: 'tmp/discounts-admin.png', fullPage: true })
    const code = await DiscountCode.findByOrFail('code', 'WELCOME20')
    assert.equal(code.percentOff, 20)
    assert.isTrue(code.active)

    await browserContext.clearCookies()
    const page = await visit(route('products.show', { handle: variant.product.handle }))
    page.on('pageerror', (error) => errors.push(error.message))
    await page.getByRole('button', { name: 'Add to cart', exact: true }).click()
    await page.getByRole('button', { name: 'Open cart', exact: true }).click()
    await page.getByRole('button', { name: 'Checkout', exact: true }).click()
    await page.assertPath(route('checkout.create'))
    await page.getByLabel('Email address', { exact: true }).fill('discount@example.com')
    await page.getByLabel('Discount code', { exact: true }).fill('NOPE')
    await page.getByLabel('Discount code', { exact: true }).press('Enter')
    await page.getByText('This code isn’t valid.', { exact: true }).waitFor()
    assert.equal(
      await Order.query()
        .count('* as total')
        .first()
        .then((r) => r?.$extras.total),
      0
    )
    await page.getByLabel('Discount code', { exact: true }).fill('welcome20')
    await page.getByRole('button', { name: 'Apply', exact: true }).click()
    await page.getByText('Discount (WELCOME20)', { exact: true }).waitFor()
    await page.getByText('−₱99.80', { exact: true }).waitFor()
    assert.equal(
      await page.getByLabel('Email address', { exact: true }).inputValue(),
      'discount@example.com'
    )
    await page.screenshot({ path: 'tmp/discounts-checkout.png', fullPage: true })

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
    assert.equal(order.discountCode, 'WELCOME20')
    assert.equal(order.discountMinor, 9_980)
    assert.equal(order.totalMinor, 49_900 - 9_980 + 10_000)
    await page.getByText('Discount (WELCOME20)', { exact: true }).waitFor()
    assert.isEmpty(errors)
  })
})

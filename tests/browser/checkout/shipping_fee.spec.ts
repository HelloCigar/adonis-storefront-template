import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import database from '@adonisjs/lucid/services/db'
import InventoryService from '#services/catalog/inventory_service'
import { ProductVariantFactory } from '#database/factories/product_variant_factory'
import { finishedStoreSetup, savedStoreSettings } from '#tests/helpers/store_setup'
import { simulatedCheckout } from '#tests/helpers/simulated_checkout'
import { UserFactory } from '#database/factories/user_factory'

test.group('Checkout shipping fee', (group) => {
  group.each.setup(async () => {
    const truncate = await testUtils.db().truncate()
    return async () => {
      // Checkouts hold stock; release it before the tables are emptied.
      const inventory = await app.container.make(InventoryService)
      const held = await database.from('stock_reservations').where('state', 'reserved')
      for (const id of new Set(held.map((row) => row.order_id)))
        await database.transaction((trx) => inventory.release(trx, id))
      await truncate()
    }
  })

  test('an order placed after a fee change carries the new fee', async ({ visit, route, db }) => {
    await savedStoreSettings({ shippingMinor: 15000 })
    const variant = await ProductVariantFactory.merge({
      priceAmount: 499,
      inventoryQuantity: 2,
    }).create()
    await variant.load('product')

    const page = await visit(route('products.show', { handle: variant.product.handle }))
    await page.getByRole('button', { name: 'Add to cart', exact: true }).click()
    await page.getByRole('button', { name: 'Open cart', exact: true }).click()
    await page.getByRole('button', { name: 'Checkout', exact: true }).click()
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
    await db.assertHas('orders', { shipping_minor: 15000 })
  })

  test('orders placed before a fee change keep their fee', async ({
    visit,
    route,
    browserContext,
    db,
  }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    await finishedStoreSetup()
    const { order } = await simulatedCheckout()
    await browserContext.loginAs(admin)

    const settings = await visit(route('settings.store.edit'))
    await settings.getByLabel('Shipping fee', { exact: true }).fill('150')
    await settings.getByRole('button', { name: 'Save', exact: true }).click()
    await settings.getByText('Store settings saved.', { exact: true }).first().waitFor()

    const page = await visit(route('seller.orders.show', { id: order.id }))
    await page.assertVisible(page.getByText('₱100.00', { exact: true }).first())
    await db.assertHas('orders', { id: order.id, shipping_minor: 10000 })
  })

  test('a fee change during checkout is shown before any payment', async ({ visit, route, db }) => {
    const variant = await ProductVariantFactory.merge({
      priceAmount: 499,
      inventoryQuantity: 2,
    }).create()
    await variant.load('product')

    const page = await visit(route('products.show', { handle: variant.product.handle }))
    await page.getByRole('button', { name: 'Add to cart', exact: true }).click()
    await page.getByRole('button', { name: 'Open cart', exact: true }).click()
    await page.getByRole('button', { name: 'Checkout', exact: true }).click()
    await page.getByRole('heading', { name: 'Checkout', exact: true }).waitFor()
    await page.getByLabel('Email address', { exact: true }).fill('browser@example.com')
    await page.getByLabel('First name', { exact: true }).fill('Guest')
    await page.getByLabel('Last name', { exact: true }).fill('Buyer')
    await page.getByLabel('Phone number', { exact: true }).fill('09171234567')
    await page.getByLabel('Street address', { exact: true }).fill('123 Sample Street')
    await page.getByLabel('City / municipality', { exact: true }).fill('Quezon City')
    await page.getByLabel('Province / region', { exact: true }).fill('Metro Manila')
    await page.getByLabel('Postal code', { exact: true }).fill('1100')
    // The admin changes the fee while the shopper is still on the checkout page.
    await savedStoreSettings({ shippingMinor: 15000 })
    await page.getByRole('button', { name: 'Continue to payment', exact: true }).click()

    await page.assertVisible(
      page
        .getByText('Prices or availability changed. Review the updated quote.', { exact: true })
        .first()
    )
    await page.assertVisible(page.getByText('₱150.00', { exact: true }).first())
    await db.assertEmpty('orders')
  })
})

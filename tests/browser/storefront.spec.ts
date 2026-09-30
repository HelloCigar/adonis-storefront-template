import Product from '#models/product'
import ProductVariant from '#models/product_variant'
import Collection from '#models/collection'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

test.group('Reference port', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('navigates catalogue pages, searches and changes the local cart', async ({
    visit,
    assert,
  }) => {
    const product = await Product.create({
      title: 'Desk Lamp',
      handle: 'desk-lamp',
      status: 'active',
      publishedAt: DateTime.utc(),
    })
    await ProductVariant.create({
      productId: product.id,
      title: 'Default',
      priceAmount: 49,
      currencyCode: 'PHP',
      availableForSale: true,
      inventoryQuantity: 8,
      position: 0,
    })
    const collection = await Collection.create({
      title: 'Lighting',
      handle: 'lighting',
      publishedAt: DateTime.utc(),
    })
    await collection.related('products').attach({ [product.id]: { position: 0 } })
    const page = await visit('/')
    const errors: string[] = []
    const storeRequests: {
      method: string
      url: string
      inertia: string | undefined
      partial: string | undefined
    }[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('request', (request) => {
      const headers = request.headers()
      if (
        request.url().includes('/store/cart') ||
        headers['x-inertia-partial-data'] === 'searchResults'
      ) {
        storeRequests.push({
          method: request.method(),
          url: request.url(),
          inertia: headers['x-inertia'],
          partial: headers['x-inertia-partial-data'],
        })
      }
    })
    await page.getByRole('heading', { name: 'Bestselling products' }).waitFor()
    await page.getByRole('link', { name: 'Collections', exact: true }).first().click()
    await page.assertPath('/collections')
    await page.getByRole('link', { name: 'Lighting' }).locator('span').click()
    await page.assertPath('/collection/lighting')
    await page.getByRole('link', { name: 'Desk Lamp' }).last().click()
    await page.assertPath('/product/desk-lamp')
    await page.getByRole('button', { name: 'Add to cart', exact: true }).click()
    await page.getByRole('button', { name: 'Open cart', exact: true }).click()
    await page.assertTextContains('[role="dialog"]', 'Desk Lamp - Default')
    await page.getByRole('spinbutton').last().fill('2')
    await page.getByRole('spinbutton').last().blur()
    await page.getByText('₱98.00', { exact: true }).waitFor()
    await page.getByRole('spinbutton').last().fill('9')
    await page.getByRole('spinbutton').last().blur()
    await page.getByText('The requested quantity is not available.', { exact: true }).waitFor()
    await page.getByText('₱98.00', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Close' }).first().click()
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await page.getByPlaceholder('Search our store…').fill('Desk')
    await page.getByRole('option').filter({ hasText: 'Desk Lamp' }).waitFor()
    await page.assertPath('/product/desk-lamp')
    assert.isTrue(
      storeRequests.some((request) => request.method === 'POST' && request.inertia === 'true')
    )
    assert.isTrue(
      storeRequests.some((request) => request.method === 'PATCH' && request.inertia === 'true')
    )
    assert.isTrue(
      storeRequests.some(
        (request) =>
          request.partial === 'searchResults' && request.url.includes('/product/desk-lamp')
      )
    )
    assert.isFalse(
      storeRequests.some(
        (request) => request.method === 'GET' && request.url.includes('/store/cart')
      )
    )
    assert.deepEqual(errors, [])
    await page.setViewportSize({ width: 390, height: 844 })
    await page.keyboard.press('Escape')
    await page.assertVisible('header')
    const fitsViewport = await page.evaluate<boolean>(
      'document.documentElement.scrollWidth <= window.innerWidth'
    )
    assert.isTrue(fitsViewport)
  })

  test('edits the signed-in profile and creates an address', async ({
    visit,
    browserContext,
    assert,
  }) => {
    const user = await User.create({
      email: 'customer@example.com',
      password: 'secret-password',
      firstName: 'Mina',
      fullName: 'Mina',
    })
    await browserContext.loginAs(user)
    const page = await visit('/account')
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await page.getByLabel('First name', { exact: true }).fill('Luna')
    await page.getByRole('button', { name: 'Save changes', exact: true }).click()
    await page.getByRole('heading', { name: 'Hello, Luna' }).waitFor()
    await page.getByRole('button', { name: 'Add address', exact: true }).click()
    await page.getByLabel('Address', { exact: true }).fill('10 Main Street')
    await page.getByLabel('Postal code', { exact: true }).fill('1000')
    await page.getByLabel('City', { exact: true }).fill('Manila')
    await page.getByRole('button', { name: 'Save address', exact: true }).click()
    await page.getByText('10 Main Street', { exact: true }).waitFor()
    await user.refresh()
    assert.equal(user.firstName, 'Luna')
    assert.isNotNull(user.defaultAddressId)
  })
})

import Collection from '#models/collection'
import Product from '#models/product'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

test.group('Collection controls', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('filters and paginates through partial Inertia visits', async ({ visit, assert }) => {
    const collection = await Collection.create({
      title: 'Query test',
      handle: 'query-test',
      publishedAt: DateTime.utc(),
    })
    for (let index = 0; index < 14; index++) {
      const product = await Product.create({
        title: `Item ${index}`,
        handle: `item-${index}`,
        status: 'active',
        publishedAt: DateTime.utc(),
        vendor: index === 13 ? 'Beta' : 'Alpha',
      })
      await product.related('variants').create({
        title: 'Default',
        priceAmount: 10,
        currencyCode: 'PHP',
        availableForSale: index !== 0,
        position: 0,
      })
      await collection.related('products').attach({ [product.id]: { position: index } })
    }

    const page = await visit('/collection/query-test')
    const errors: string[] = []
    const requests: { inertia?: string; partial?: string; navigation: boolean }[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('request', (request) => {
      if (request.url().includes('/collection/query-test')) {
        const headers = request.headers()
        requests.push({
          inertia: headers['x-inertia'],
          partial: headers['x-inertia-partial-data'],
          navigation: request.isNavigationRequest(),
        })
      }
    })
    await page.getByRole('heading', { name: 'Query test', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Availability', exact: true }).click()
    await page.getByRole('switch', { name: 'In stock', exact: true }).click()
    await page.getByRole('button', { name: 'Sold out', exact: true }).waitFor({ state: 'detached' })
    await page.assertQueryString({ available: 'true', page: '1' })

    await page.getByRole('button', { name: 'Next', exact: true }).click()
    await page.getByRole('link', { name: "View product: 'Item 13'", exact: true }).waitFor()
    await page.assertQueryString({ available: 'true', page: '2' })

    await page.getByRole('button', { name: 'Vendor', exact: true }).click()
    await page.getByRole('checkbox', { name: 'Beta', exact: true }).check()
    await page.getByRole('button', { name: 'Previous', exact: true }).waitFor({ state: 'detached' })
    await page.assertQueryString({ page: '1' })
    await page.getByRole('checkbox', { name: 'Alpha', exact: true }).check()
    await page.getByRole('button', { name: 'Next', exact: true }).waitFor()

    await page.getByRole('button', { name: 'Price', exact: true }).click()
    await page.getByRole('spinbutton', { name: 'From', exact: true }).fill('20')
    await page.getByRole('spinbutton', { name: 'From', exact: true }).blur()
    await page.getByText('No products found', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Clear filters', exact: true }).first().click()
    await page.getByRole('button', { name: 'Sold out', exact: true }).waitFor()
    assert.isFalse(await page.getByRole('checkbox', { name: 'Alpha', exact: true }).isChecked())
    assert.isFalse(await page.getByRole('checkbox', { name: 'Beta', exact: true }).isChecked())

    assert.isAtLeast(requests.length, 6)
    assert.isTrue(
      requests.every(
        (request) =>
          request.inertia === 'true' && request.partial === 'catalogue' && !request.navigation
      )
    )
    assert.deepEqual(errors, [])
  })
})

import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { savedStoreSettings } from '#tests/helpers/store_setup'

test.group('Store identity in the page shell', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('the storefront header shows the saved store name', async ({ visit, route }) => {
    await savedStoreSettings({ storeName: 'Lantern Goods' })

    const page = await visit(route('home'))

    const header = page.getByRole('banner')
    await page.assertVisible(header.getByText('Lantern Goods', { exact: true }).first())
    await page.assertNotExists(page.getByText('MediaBunny', { exact: true }))
  })

  test('page titles end with the saved store name', async ({ visit, route }) => {
    await savedStoreSettings({ storeName: 'Lantern Goods' })

    const page = await visit(route('home'))

    await page.assertTitleContains('Lantern Goods')
  })

  test('the sign-in page shows the saved store name', async ({ visit, route }) => {
    await savedStoreSettings({ storeName: 'Lantern Goods' })

    const page = await visit(route('session.create'))

    await page.assertVisible(page.getByText('Lantern Goods', { exact: true }).first())
    await page.assertNotExists(page.getByText('Your store', { exact: true }))
  })

  test('the storefront footer shows the contact email', async ({ visit, route }) => {
    await savedStoreSettings({ contactEmail: 'hello@lantern.test' })

    const page = await visit(route('home'))

    await page.assertVisible(page.getByRole('link', { name: 'hello@lantern.test', exact: true }))
  })
})

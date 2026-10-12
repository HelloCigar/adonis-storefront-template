import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import { finishedStoreSetup } from '#tests/helpers/store_setup'

test.group('Store settings', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test("store settings show the store's saved details", async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    await finishedStoreSetup({
      storeName: 'Lantern Goods',
      contactEmail: 'hello@lantern.test',
      shippingMinor: 15000,
    })
    await browserContext.loginAs(admin)

    const page = await visit(route('settings.store.edit'))

    const storeName = page.getByLabel('Store name', { exact: true })
    await storeName.waitFor()
    assert.equal(await storeName.inputValue(), 'Lantern Goods')
    assert.equal(
      await page.getByLabel('Contact email', { exact: true }).inputValue(),
      'hello@lantern.test'
    )
    assert.equal(await page.getByLabel('Shipping fee', { exact: true }).inputValue(), '150')
  })

  test('saving store settings confirms and keeps the new values', async ({
    visit,
    route,
    browserContext,
    db,
  }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    await finishedStoreSetup({
      storeName: 'Lantern Goods',
      contactEmail: 'hello@lantern.test',
      shippingMinor: 15000,
    })
    await browserContext.loginAs(admin)

    const page = await visit(route('settings.store.edit'))
    await page.getByLabel('Store name', { exact: true }).fill('Harbor Supply')
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    // The toast and its aria-live mirror both carry the text.
    const flash = page.getByText('Store settings saved.', { exact: true }).first()
    await flash.waitFor()
    await page.assertPath(route('settings.store.edit'))
    await page.assertVisible(flash)
    await db.assertHas('store_settings', { id: 1, store_name: 'Harbor Supply' })
  })

  test('store settings reject a blank store name', async ({ visit, route, browserContext, db }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    await finishedStoreSetup({
      storeName: 'Lantern Goods',
      contactEmail: 'hello@lantern.test',
      shippingMinor: 15000,
    })
    await browserContext.loginAs(admin)

    const page = await visit(route('settings.store.edit'))
    await page.getByLabel('Store name', { exact: true }).fill('')
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    await page.assertVisible(page.getByText('Enter your store name.', { exact: true }))
    await db.assertHas('store_settings', { id: 1, store_name: 'Lantern Goods' })
  })

  test("staff can't open {page}")
    .with([{ page: 'settings.store.edit' }, { page: 'settings.store_policies.edit' }] as const)
    .run(async ({ visit, route, browserContext }, row) => {
      const staff = await UserFactory.merge({ role: 'staff' }).create()
      await finishedStoreSetup()
      await browserContext.loginAs(staff)

      const page = await visit(route(row.page))

      await page.assertNotExists(page.getByLabel('Store name', { exact: true }))
      await page.assertNotExists(page.getByRole('textbox', { name: 'Refund policy', exact: true }))
    })

  test('the "Store" and "Policies" settings links show for {role} accounts: {visible}')
    .with([
      { role: 'admin', visible: true },
      { role: 'staff', visible: false },
    ] as const)
    .run(async ({ visit, route, browserContext }, row) => {
      const user = await UserFactory.merge({ role: row.role }).create()
      await finishedStoreSetup()
      await browserContext.loginAs(user)

      const page = await visit(route('settings'))
      await page.getByRole('link', { name: 'Security', exact: true }).first().waitFor()

      const storeLink = page.getByRole('link', { name: 'Store', exact: true })
      if (row.visible) await page.assertExists(storeLink)
      else await page.assertNotExists(storeLink)
    })
})

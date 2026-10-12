import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import { finishedStoreSetup, savedStorePolicy } from '#tests/helpers/store_setup'
import { ProductVariantFactory } from '#database/factories/product_variant_factory'
import StoreSetting from '#models/settings/store_setting'

const items = [
  'Add a product shoppers can buy',
  'Invite a staff member',
  'Write your store policies',
] as const

test.group('Launch checklist', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('a newly set-up store shows the launch checklist with nothing done', async ({
    visit,
    route,
    browserContext,
  }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    await finishedStoreSetup()
    await browserContext.loginAs(admin)

    const page = await visit(route('dashboard'))

    const checklist = page.getByRole('region', { name: 'Launch checklist', exact: true })
    await checklist.waitFor()
    for (const item of items) {
      const row = checklist.getByRole('listitem').filter({ hasText: item })
      await page.assertVisible(row.getByText('To do', { exact: true }))
    }
  })

  test('a checklist item is done once its condition holds: {done}')
    .with([
      { condition: 'product', done: 'Add a product shoppers can buy' },
      { condition: 'staff', done: 'Invite a staff member' },
      { condition: 'policy', done: 'Write your store policies' },
    ] as const)
    .run(async ({ visit, route, browserContext }, row) => {
      const admin = await UserFactory.merge({ role: 'admin' }).create()
      await finishedStoreSetup()
      if (row.condition === 'product') await ProductVariantFactory.create()
      if (row.condition === 'staff') await UserFactory.merge({ role: 'staff' }).create()
      if (row.condition === 'policy')
        await savedStorePolicy('refund-policy', 'Returns accepted within 30 days.')
      await browserContext.loginAs(admin)

      const page = await visit(route('dashboard'))

      const checklist = page.getByRole('region', { name: 'Launch checklist', exact: true })
      await checklist.waitFor()
      for (const item of items) {
        const itemRow = checklist.getByRole('listitem').filter({ hasText: item })
        await page.assertVisible(
          itemRow.getByText(item === row.done ? 'Done' : 'To do', { exact: true })
        )
      }
    })

  test('a done item stays done after its condition lapses', async ({
    visit,
    route,
    browserContext,
  }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    await finishedStoreSetup()
    const variant = await ProductVariantFactory.create()
    await variant.load('product')
    await browserContext.loginAs(admin)

    const first = await visit(route('dashboard'))
    await first.getByRole('region', { name: 'Launch checklist', exact: true }).waitFor()
    await variant.product.merge({ status: 'archived' }).save()

    const page = await visit(route('dashboard'))
    const checklist = page.getByRole('region', { name: 'Launch checklist', exact: true })
    await checklist.waitFor()
    const row = checklist
      .getByRole('listitem')
      .filter({ hasText: 'Add a product shoppers can buy' })
    await page.assertVisible(row.getByText('Done', { exact: true }))
  })

  test('the checklist disappears once every item is done', async ({
    visit,
    route,
    browserContext,
  }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    await finishedStoreSetup()
    await ProductVariantFactory.create()
    await UserFactory.merge({ role: 'staff' }).create()
    await savedStorePolicy('refund-policy', 'Returns accepted within 30 days.')
    await browserContext.loginAs(admin)

    const page = await visit(route('dashboard'))

    // Absence only means something once the dashboard has rendered.
    await page.getByRole('heading', { name: 'Sales', exact: true }).waitFor()
    await page.assertNotExists(page.getByRole('region', { name: 'Launch checklist', exact: true }))
  })

  test('"Dismiss" hides the checklist', async ({ visit, route, browserContext, assert }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    await finishedStoreSetup()
    await browserContext.loginAs(admin)

    const page = await visit(route('dashboard'))
    const checklist = page.getByRole('region', { name: 'Launch checklist', exact: true })
    await checklist.getByRole('button', { name: 'Dismiss', exact: true }).click()

    await page.assertNotExists(checklist)
    await page.assertPath(route('dashboard'))
    const settings = await StoreSetting.current()
    assert.isOk(settings.checklistDismissedAt)
  })

  test('a dismissed checklist stays hidden for other admins', async ({
    visit,
    route,
    browser,
    browserContext,
    cleanup,
  }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    const otherAdmin = await UserFactory.merge({ role: 'admin' }).create()
    await finishedStoreSetup()
    await browserContext.loginAs(admin)
    const first = await visit(route('dashboard'))
    const firstChecklist = first.getByRole('region', { name: 'Launch checklist', exact: true })
    await firstChecklist.getByRole('button', { name: 'Dismiss', exact: true }).click()
    await first.assertNotExists(firstChecklist)

    const otherContext = await browser.newContext()
    cleanup(() => otherContext.close())
    await otherContext.loginAs(otherAdmin)
    // A fresh context has no base URL, so it visits the absolute address.
    const page = await otherContext.visit(new URL(route('dashboard'), first.url()).href)

    // Absence only means something once the dashboard has rendered.
    await page.getByRole('heading', { name: 'Sales', exact: true }).waitFor()
    await page.assertNotExists(page.getByRole('region', { name: 'Launch checklist', exact: true }))
  })
})

import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import { deployedStorePolicy, savedStoreSettings } from '#tests/helpers/store_setup'

test.group('Store setup wizard', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('each step opens with the store current values filled in: {label}')
    .with([
      { step: 'identity', label: 'Store name', value: 'MediaBunny', saved: [] },
      { step: 'identity', label: 'Contact email', value: 'store@example.com', saved: [] },
      { step: 'shipping', label: 'Shipping fee', value: '100', saved: ['identity'] },
    ] as const)
    .run(async ({ visit, route, browserContext, assert }, row) => {
      const admin = await UserFactory.merge({ role: 'admin' }).create()
      await savedStoreSettings({ savedSteps: [...row.saved] })
      await browserContext.loginAs(admin)

      const page = await visit(route('setup.show', { step: row.step }))

      assert.equal(await page.getByLabel(row.label, { exact: true }).inputValue(), row.value)
    })

  test('"Skip for now" leaves the wizard for the dashboard with the resume prompt', async ({
    visit,
    route,
    browserContext,
  }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    await browserContext.loginAs(admin)

    const page = await visit(route('setup.show', { step: 'identity' }))
    await page.getByRole('link', { name: 'Skip for now', exact: true }).click()

    const prompt = page.getByText('Finish setting up your store', { exact: true })
    await prompt.waitFor()
    await page.assertPath(route('dashboard'))
    await page.assertVisible(prompt)
  })

  test('"Back" from shipping shows the saved identity', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    await savedStoreSettings({ storeName: 'Lantern Goods', savedSteps: ['identity'] })
    await browserContext.loginAs(admin)

    const page = await visit(route('setup.show', { step: 'shipping' }))
    await page.getByRole('link', { name: 'Back', exact: true }).click()

    const storeName = page.getByLabel('Store name', { exact: true })
    await storeName.waitFor()
    await page.assertPath(route('setup.show', { step: 'identity' }))
    assert.equal(await storeName.inputValue(), 'Lantern Goods')
  })

  test("a later step can't be opened before earlier steps are saved", async ({
    visit,
    route,
    browserContext,
  }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    await browserContext.loginAs(admin)

    const page = await visit(route('setup.show', { step: 'policies' }))

    await page.assertPath(route('setup.show', { step: 'identity' }))
  })

  test("staff can't open the wizard", async ({ visit, route, browserContext }) => {
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    await browserContext.loginAs(staff)

    const page = await visit(route('setup.show', { step: 'identity' }))

    await page.assertNotExists(page.getByLabel('Store name', { exact: true }))
  })

  test('a policy supplied with the deployment opens pre-filled in its editor', async ({
    visit,
    route,
    browserContext,
  }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    await savedStoreSettings({ savedSteps: ['identity', 'shipping'] })
    deployedStorePolicy('refund-policy', 'Refund policy', '<p>Returns accepted within 7 days.</p>')
    await browserContext.loginAs(admin)

    const page = await visit(route('setup.show', { step: 'policies' }))

    await page.assertVisible(page.getByText('Returns accepted within 7 days.', { exact: true }))
  })
})

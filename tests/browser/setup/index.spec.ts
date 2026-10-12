import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import { finishedStoreSetup, savedStoreSettings } from '#tests/helpers/store_setup'

test.group('Store setup resume', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('the resume prompt opens the first unfinished step', async ({
    visit,
    route,
    browserContext,
  }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    await savedStoreSettings({ savedSteps: ['identity'] })
    await browserContext.loginAs(admin)
    await browserContext.setSession({ storeSetupOffered: true })

    const page = await visit(route('dashboard'))
    await page.getByRole('link', { name: 'Finish setting up your store', exact: true }).click()

    await page.getByLabel('Shipping fee', { exact: true }).waitFor()
    await page.assertPath(route('setup.show', { step: 'shipping' }))
  })

  test('another admin opening setup resumes where the store left off', async ({
    visit,
    route,
    browserContext,
  }) => {
    await UserFactory.merge({ role: 'admin' }).create()
    const secondAdmin = await UserFactory.merge({ role: 'admin' }).create()
    await savedStoreSettings({ savedSteps: ['identity', 'shipping'] })
    await browserContext.loginAs(secondAdmin)

    const page = await visit(route('setup.index'))

    await page.assertPath(route('setup.show', { step: 'policies' }))
  })

  test("setup isn't offered again once finished", async ({ visit, route, browserContext }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    await finishedStoreSetup()
    await browserContext.loginAs(admin)

    const page = await visit(route('setup.index'))

    await page.assertPath(route('dashboard'))
  })
})

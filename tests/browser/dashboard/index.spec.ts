import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import { finishedStoreSetup } from '#tests/helpers/store_setup'

test.group('Dashboard store setup offer', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test("an admin's first dashboard visit while setup is unfinished opens the identity step", async ({
    visit,
    route,
    browserContext,
  }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    await browserContext.loginAs(admin)

    const page = await visit(route('dashboard'))

    await page.assertPath(route('setup.show', { step: 'identity' }))
    await page.assertVisible(page.getByLabel('Store name', { exact: true }))
  })

  test("an admin's next dashboard visit in the same session stays on the dashboard with the resume prompt", async ({
    visit,
    route,
    browserContext,
  }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    await browserContext.loginAs(admin)
    await browserContext.setSession({ storeSetupOffered: true })

    const page = await visit(route('dashboard'))

    const prompt = page.getByText('Finish setting up your store', { exact: true })
    await prompt.waitFor()
    await page.assertPath(route('dashboard'))
    await page.assertVisible(prompt)
  })

  test('staff opening the dashboard while setup is unfinished are not redirected and see no resume prompt', async ({
    visit,
    route,
    browserContext,
  }) => {
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    await browserContext.loginAs(staff)

    const page = await visit(route('dashboard'))

    // Absence only means something once the dashboard has rendered.
    await page.getByRole('heading', { name: 'Sales', exact: true }).waitFor()
    await page.assertPath(route('dashboard'))
    await page.assertNotExists(page.getByText('Finish setting up your store', { exact: true }))
    await page.assertNotExists(page.getByText('Launch checklist', { exact: true }))
  })

  test("once setup is finished, an admin's dashboard visit is not redirected", async ({
    visit,
    route,
    browserContext,
  }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    await finishedStoreSetup()
    await browserContext.loginAs(admin)

    const page = await visit(route('dashboard'))

    // Absence only means something once the dashboard has rendered.
    await page.getByRole('heading', { name: 'Sales', exact: true }).waitFor()
    await page.assertPath(route('dashboard'))
    await page.assertNotExists(page.getByText('Finish setting up your store', { exact: true }))
  })
})

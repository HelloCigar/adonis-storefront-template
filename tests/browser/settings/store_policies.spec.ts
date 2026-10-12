import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import { finishedStoreSetup, savedStorePolicy } from '#tests/helpers/store_setup'

test.group('Store policy settings', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('saving policies in settings confirms and publishes them', async ({
    visit,
    route,
    browserContext,
  }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    await finishedStoreSetup()
    await browserContext.loginAs(admin)

    const page = await visit(route('settings.store_policies.edit'))
    await page
      .getByRole('textbox', { name: 'Shipping policy', exact: true })
      .fill('Ships within 2 days.')
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    // The toast and its aria-live mirror both carry the text.
    await page.getByText('Policies saved.', { exact: true }).first().waitFor()

    const policies = await visit(route('policies.index'))
    await policies.assertVisible(
      policies.getByRole('link', { name: 'Shipping policy', exact: true }).first()
    )
  })

  test('clearing a saved policy takes it off the storefront', async ({
    visit,
    route,
    browserContext,
  }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    await finishedStoreSetup()
    await savedStorePolicy('refund-policy', 'Returns accepted within 30 days.')
    await browserContext.loginAs(admin)

    const page = await visit(route('settings.store_policies.edit'))
    await page.getByRole('textbox', { name: 'Refund policy', exact: true }).fill('')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await page.getByText('Policies saved.', { exact: true }).first().waitFor()

    const policies = await visit(route('policies.index'))
    await policies.assertNotExists(
      policies.getByRole('link', { name: 'Refund policy', exact: true })
    )
  })
})

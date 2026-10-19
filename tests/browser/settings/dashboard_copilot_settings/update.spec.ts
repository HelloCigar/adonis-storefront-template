import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import AssistantModelProvider from '#assistant/model_provider'
import FakeAssistantModelProvider from '#tests/helpers/fake_assistant_model_provider'
import { finishedStoreSetup } from '#tests/helpers/store_setup'

test.group('Dashboard copilot setting', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('an admin switches the copilot {to}')
    .with([
      { to: 'on', flash: 'Copilot turned on.', enabled: true },
      { to: 'off', flash: 'Copilot turned off.', enabled: false },
    ] as const)
    .run(async ({ visit, route, browserContext, swap, db }, row) => {
      const admin = await UserFactory.merge({ role: 'admin' }).create()
      const settings = await finishedStoreSetup()
      settings.dashboardCopilotEnabled = !row.enabled
      await settings.save()
      swap(AssistantModelProvider, new FakeAssistantModelProvider(true))
      await browserContext.loginAs(admin)

      const page = await visit(route('settings.store.edit'))
      await page.getByRole('switch', { name: 'Copilot', exact: true }).click()

      // The toast and its aria-live mirror both carry the text.
      const flash = page.getByText(row.flash, { exact: true }).first()
      await flash.waitFor()
      await page.assertPath(route('settings.store.edit'))
      await page.assertVisible(flash)
      await db.assertHas('store_settings', { id: 1, dashboard_copilot_enabled: row.enabled })
    })
})

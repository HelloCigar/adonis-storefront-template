import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import AssistantModelProvider from '#assistant/model_provider'
import FakeAssistantModelProvider from '#tests/helpers/fake_assistant_model_provider'
import { finishedStoreSetup } from '#tests/helpers/store_setup'

test.group('Shopping assistant setting', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('an admin switches the shopping assistant {to}')
    .with([
      { to: 'on', flash: 'Shopping assistant turned on.', enabled: true },
      { to: 'off', flash: 'Shopping assistant turned off.', enabled: false },
    ] as const)
    .run(async ({ visit, route, browserContext, swap, db }, row) => {
      const admin = await UserFactory.merge({ role: 'admin' }).create()
      const settings = await finishedStoreSetup()
      if (row.to === 'off') {
        settings.shoppingAssistantEnabled = true
        await settings.save()
      }
      swap(AssistantModelProvider, new FakeAssistantModelProvider())
      await browserContext.loginAs(admin)

      const page = await visit(route('settings.store.edit'))
      await page.getByRole('switch', { name: 'Shopping assistant', exact: true }).click()

      // The toast and its aria-live mirror both carry the text.
      const flash = page.getByText(row.flash, { exact: true }).first()
      await flash.waitFor()
      await page.assertPath(route('settings.store.edit'))
      await page.assertVisible(flash)
      await db.assertHas('store_settings', { id: 1, shopping_assistant_enabled: row.enabled })
    })

  test('with no AI service set up, the switch is disabled and says why', async ({
    visit,
    route,
    browserContext,
    swap,
    assert,
  }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    await finishedStoreSetup()
    swap(AssistantModelProvider, new FakeAssistantModelProvider(false))
    await browserContext.loginAs(admin)

    const page = await visit(route('settings.store.edit'))

    await page.assertVisible(page.getByText("AI isn't set up for this store yet.", { exact: true }))
    const toggle = page.getByRole('switch', { name: 'Shopping assistant', exact: true })
    assert.isTrue(await toggle.isDisabled())
  })
})

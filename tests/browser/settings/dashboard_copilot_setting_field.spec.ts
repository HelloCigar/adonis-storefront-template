import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import AssistantModelProvider from '#assistant/model_provider'
import FakeAssistantModelProvider from '#tests/helpers/fake_assistant_model_provider'
import { finishedStoreSetup } from '#tests/helpers/store_setup'

test.group('Dashboard copilot setting field', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('with no AI service set up, the copilot switch is disabled and says why', async ({
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

    await page.assertPath(route('settings.store.edit'))
    const toggle = page.getByRole('switch', { name: 'Copilot', exact: true })
    assert.isTrue(await toggle.isDisabled())
    // The shopping assistant's switch says the same, so read this switch's own help text.
    const help = await toggle.getAttribute('aria-describedby')
    assert.isNotNull(help)
    await page.assertText(
      `[id="${help!.split(' ').at(-1)}"]`,
      "AI isn't set up for this store yet."
    )
  })
})

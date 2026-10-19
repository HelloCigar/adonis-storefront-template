import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { storeStaff } from '#tests/helpers/accounts'
import { assistantOn, pastConversation } from '#tests/helpers/assistant'
import { pastCopilotConversation } from '#tests/helpers/copilot'

test.group('Copilot conversations in the storefront', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test("copilot conversations never appear in the storefront assistant's history", async ({
    visit,
    route,
    browserContext,
  }) => {
    const staff = await storeStaff()
    await assistantOn()
    await pastConversation(staff, { title: 'Gift ideas' })
    await pastCopilotConversation(staff, { title: 'Low stock' })
    await browserContext.loginAs(staff)

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await page.getByRole('button', { name: 'Past conversations', exact: true }).click()

    await page.assertPath(route('home'))
    await page.assertVisible(page.getByText('Gift ideas', { exact: true }))
    await page.assertNotExists(page.getByText('Low stock', { exact: true }))
  })
})

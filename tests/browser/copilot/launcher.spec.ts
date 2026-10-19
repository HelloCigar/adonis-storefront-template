import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { storeStaff } from '#tests/helpers/accounts'
import { copilotOn } from '#tests/helpers/copilot'

test.group('Copilot launcher', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('staff see the copilot on a dashboard page when it is on', async ({
    visit,
    route,
    browserContext,
  }) => {
    const staff = await storeStaff()
    await copilotOn()
    await browserContext.loginAs(staff)

    const page = await visit(route('dashboard'))

    await page.assertPath(route('dashboard'))
    await page.assertVisible(page.getByRole('button', { name: 'Open copilot', exact: true }))
  })

  test("the copilot isn't offered when {reason}")
    .with([
      { reason: 'it is switched off', enabled: false, configured: true },
      { reason: 'no AI service is set up', enabled: true, configured: false },
    ])
    .run(async ({ visit, route, browserContext }, row) => {
      const staff = await storeStaff()
      await copilotOn({ enabled: row.enabled, configured: row.configured })
      await browserContext.loginAs(staff)

      const page = await visit(route('dashboard'))

      await page.assertPath(route('dashboard'))
      await page.assertNotExists(page.getByRole('button', { name: 'Open copilot', exact: true }))
    })
})

import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { storeStaff } from '#tests/helpers/accounts'
import {
  copilotOn,
  copilotProposalConversation,
  deskLamp,
  sendCopilotMessage,
} from '#tests/helpers/copilot'

test.group('Copilot switched off mid-conversation', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('switching the copilot off mid-conversation stops further messages', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const staff = await storeStaff()
    const { settings } = await copilotOn()
    await browserContext.loginAs(staff)

    const page = await visit(route('dashboard'))
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
    settings.dashboardCopilotEnabled = false
    await settings.save()
    await sendCopilotMessage(page, 'Hello')

    await page.assertPath(route('dashboard'))
    await page.assertVisible(page.getByText('The copilot has been switched off.', { exact: true }))
    assert.isTrue(await page.getByRole('button', { name: 'Send', exact: true }).isDisabled())
  })

  test('switching the copilot off mid-conversation refuses Apply', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const staff = await storeStaff()
    const { variant } = await deskLamp()
    const { settings } = await copilotOn()
    await copilotProposalConversation({
      owner: staff,
      action: 'variant_update',
      items: [
        {
          recordId: variant.id,
          label: 'Desk Lamp',
          before: { price: 1200 },
          after: { price: 999 },
        },
      ],
    })
    await browserContext.loginAs(staff)

    const page = await visit(route('dashboard'))
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
    const apply = page.getByTestId('copilot-proposal').getByRole('button', {
      name: 'Apply',
      exact: true,
    })
    await apply.waitFor()
    settings.dashboardCopilotEnabled = false
    await settings.save()
    await apply.click()

    await page.assertVisible(page.getByText('The copilot has been switched off.', { exact: true }))
    await page.assertPath(route('dashboard'))
    await variant.refresh()
    assert.equal(Number(variant.priceAmount), 1200)
  })
})

import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { storeStaff } from '#tests/helpers/accounts'
import { awaitCopilotReply, copilotOn, sendCopilotMessage } from '#tests/helpers/copilot'
import { paidOrder } from '#tests/helpers/delivery'

test.group('Copilot messages', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test("clicking a suggested question shows the copilot's reply", async ({
    visit,
    route,
    browserContext,
  }) => {
    const staff = await storeStaff()
    const { model } = await copilotOn()
    model.replyWith('Three orders are waiting to be packed.')
    await browserContext.loginAs(staff)

    const page = await visit(route('dashboard'))
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
    await awaitCopilotReply(page, () =>
      page.getByRole('button', { name: 'What needs my attention today?', exact: true }).click()
    )

    await page.assertPath(route('dashboard'))
    const thread = page.locator('[data-copilot-thread]')
    await page.assertVisible(thread.getByText('What needs my attention today?', { exact: true }))
    await page.assertVisible(
      thread.getByText('Three orders are waiting to be packed.', { exact: true })
    )
  })

  test('on an order page, the copilot is told which order is open', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const staff = await storeStaff()
    const { order } = await paidOrder()
    const { model } = await copilotOn()
    await browserContext.loginAs(staff)

    const page = await visit(route('seller.orders.show', { id: order.id }))
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
    await sendCopilotMessage(page, "What's happening with this?")

    await page.assertPath(route('seller.orders.show', { id: order.id }))
    assert.include(JSON.stringify(model.calls[0].prompt), order.number)
  })
})

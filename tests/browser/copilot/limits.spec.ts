import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { storeStaff } from '#tests/helpers/accounts'
import { copilotOn, fillCopilotMessageLimit, sendCopilotMessage } from '#tests/helpers/copilot'

test.group('Copilot limits and failures', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('the message box takes at most 2,000 characters', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const staff = await storeStaff()
    await copilotOn()
    await browserContext.loginAs(staff)

    const page = await visit(route('dashboard'))
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
    const box = page.getByRole('textbox', { name: 'Message', exact: true })
    await box.fill('a'.repeat(2001))

    await page.assertPath(route('dashboard'))
    assert.lengthOf(await box.inputValue(), 2000)
  })

  test('someone over the hourly limit is told to wait', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const staff = await storeStaff()
    const { model } = await copilotOn()
    await fillCopilotMessageLimit(staff)
    await browserContext.loginAs(staff)

    const page = await visit(route('dashboard'))
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
    await sendCopilotMessage(page, 'Hello')

    await page.assertPath(route('dashboard'))
    await page.assertVisible(
      page.getByText("You've sent a lot of messages. Please try again in a little while.", {
        exact: true,
      })
    )
    assert.lengthOf(model.calls, 0)
  })

  test("when the AI service fails, the person sees it's unavailable", async ({
    visit,
    route,
    browserContext,
  }) => {
    const staff = await storeStaff()
    const { model } = await copilotOn()
    model.failNext()
    await browserContext.loginAs(staff)

    const page = await visit(route('dashboard'))
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
    await sendCopilotMessage(page, 'Hello')

    await page.assertPath(route('dashboard'))
    await page.assertVisible(
      page.getByText("The copilot isn't available right now. Please try again in a moment.", {
        exact: true,
      })
    )
  })

  test('after a failure, sending again gets an answer', async ({
    visit,
    route,
    browserContext,
  }) => {
    const staff = await storeStaff()
    const { model } = await copilotOn()
    model.failNext().replyWith('Back now.')
    await browserContext.loginAs(staff)

    const page = await visit(route('dashboard'))
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
    await sendCopilotMessage(page, 'Hello')
    await sendCopilotMessage(page, 'Again')

    await page.assertPath(route('dashboard'))
    await page.assertVisible(
      page.locator('[data-copilot-thread]').getByText('Back now.', { exact: true })
    )
  })
})

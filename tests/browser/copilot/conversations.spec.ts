import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/account/user'
import { storeStaff } from '#tests/helpers/accounts'
import { copilotOn, pastCopilotConversation, sendCopilotMessage } from '#tests/helpers/copilot'

test.group('Copilot conversations', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('the conversation is still there on the next dashboard page', async ({
    visit,
    route,
    browserContext,
  }) => {
    const staff = await storeStaff()
    const { model } = await copilotOn()
    model.replyWith('Hi!')
    await browserContext.loginAs(staff)

    const page = await visit(route('dashboard'))
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
    await sendCopilotMessage(page, 'Hello')
    await page.getByRole('button', { name: 'Close', exact: true }).click()
    await page.getByRole('link', { name: 'Orders', exact: true }).first().click()
    await page.assertPath(route('seller.orders.index'))
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()

    const thread = page.locator('[data-copilot-thread]')
    await page.assertVisible(thread.getByText('Hello', { exact: true }))
    await page.assertVisible(thread.getByText('Hi!', { exact: true }))
  })

  test('New conversation starts an empty conversation', async ({
    visit,
    route,
    browserContext,
  }) => {
    const staff = await storeStaff()
    const { model } = await copilotOn()
    model.replyWith('Hi!')
    await browserContext.loginAs(staff)

    const page = await visit(route('dashboard'))
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
    await sendCopilotMessage(page, 'Hello')
    await page.getByRole('button', { name: 'New conversation', exact: true }).click()

    await page.assertPath(route('dashboard'))
    await page.assertVisible(page.getByText('Admins may review conversations.', { exact: true }))
    await page.assertNotExists(
      page.locator('[data-copilot-thread]').getByText('Hello', { exact: true })
    )
  })

  test("past conversations list only the person's own, with no delete", async ({
    visit,
    route,
    browserContext,
  }) => {
    const ana = await storeStaff()
    const ben = await User.create({
      fullName: 'Ben Staff',
      email: 'ben-staff@example.com',
      password: 'secret-password',
      role: 'staff',
    })
    await copilotOn()
    await pastCopilotConversation(ana, { title: 'Low stock' })
    await pastCopilotConversation(ana, { title: 'Refund question' })
    await pastCopilotConversation(ben, { title: "B's chat" })
    await browserContext.loginAs(ana)

    const page = await visit(route('dashboard'))
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
    await page.getByRole('button', { name: 'Past conversations', exact: true }).click()

    await page.assertPath(route('dashboard'))
    await page.assertVisible(page.getByText('Low stock', { exact: true }))
    await page.assertVisible(page.getByText('Refund question', { exact: true }))
    await page.assertNotExists(page.getByText("B's chat", { exact: true }))
    await page.assertNotExists(page.getByRole('button', { name: 'Delete', exact: true }))
  })

  test('opening a past conversation shows its messages', async ({
    visit,
    route,
    browserContext,
  }) => {
    const staff = await storeStaff()
    await copilotOn()
    await pastCopilotConversation(staff, {
      title: 'Low stock',
      exchange: ['Which items are low?', 'Only the lamp.'],
    })
    // A newer conversation opens first, so the past one is reached through history.
    await pastCopilotConversation(staff, { title: 'Newer chat' })
    await browserContext.loginAs(staff)

    const page = await visit(route('dashboard'))
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
    await page.getByRole('button', { name: 'Past conversations', exact: true }).click()
    await page.getByRole('button', { name: 'Low stock', exact: true }).click()

    await page.assertPath(route('dashboard'))
    const thread = page.locator('[data-copilot-thread]')
    await page.assertVisible(thread.getByText('Which items are low?', { exact: true }))
    await page.assertVisible(thread.getByText('Only the lamp.', { exact: true }))
  })
})

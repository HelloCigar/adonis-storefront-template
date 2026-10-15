import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import { assistantOn, exhaustAssistantMessages, sendMessage } from '#tests/helpers/assistant'

test.group('Shopping assistant limits', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('the message box takes at most 1,000 characters', async ({ visit, route, assert }) => {
    await assistantOn()

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    const box = page.getByRole('textbox', { name: 'Message', exact: true })
    await box.pressSequentially('a'.repeat(1001), { delay: 0 })

    const typed = await box.inputValue()
    assert.equal(typed.length, 1000)
  })

  test('a signed-in shopper over the hourly limit is told to wait', async ({
    visit,
    route,
    browserContext,
    db,
  }) => {
    const user = await UserFactory.apply('verified').create()
    await assistantOn({ contactEmail: 'hello@lantern.test' })
    await browserContext.loginAs(user)
    await exhaustAssistantMessages(user)

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await sendMessage(page, 'One more question')

    const dialog = page.getByRole('dialog', { name: 'Shopping assistant', exact: true })
    await page.assertVisible(
      dialog.getByText(
        "You've sent a lot of messages. Please try again in a little while, or reach us at hello@lantern.test.",
        { exact: true }
      )
    )
    await db.assertCount('assistant_messages', 0)
  })

  test('when the AI service fails, the shopper sees how to reach the store', async ({
    visit,
    route,
  }) => {
    const { model } = await assistantOn({ contactEmail: 'hello@lantern.test' })
    model.failNext()

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await sendMessage(page, 'Do you ship to Cebu?')

    const dialog = page.getByRole('dialog', { name: 'Shopping assistant', exact: true })
    await page.assertVisible(
      dialog.getByText(
        "The assistant isn't available right now. You can reach us at hello@lantern.test.",
        { exact: true }
      )
    )
  })

  test('after a failure, the shopper can send again and get an answer', async ({
    visit,
    route,
  }) => {
    const { model } = await assistantOn()
    model.failNext().replyWith('We ship nationwide.')

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await sendMessage(page, 'Do you ship to Cebu?')
    await sendMessage(page, 'Do you ship to Cebu?')

    const dialog = page.getByRole('dialog', { name: 'Shopping assistant', exact: true })
    await page.assertVisible(dialog.getByText('We ship nationwide.', { exact: true }))
  })

  test('switching the assistant off mid-conversation stops further messages', async ({
    visit,
    route,
    assert,
  }) => {
    const { settings } = await assistantOn({ contactEmail: 'hello@lantern.test' })

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    settings.shoppingAssistantEnabled = false
    await settings.save()
    await sendMessage(page, 'Hello')

    const dialog = page.getByRole('dialog', { name: 'Shopping assistant', exact: true })
    await page.assertVisible(
      dialog.getByText(
        "The assistant isn't available right now. You can reach us at hello@lantern.test.",
        { exact: true }
      )
    )
    assert.isTrue(await dialog.getByRole('button', { name: 'Send', exact: true }).isDisabled())
  })
})

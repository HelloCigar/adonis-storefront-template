import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import { ProductFactory } from '#database/factories/product_factory'
import { UserFactory } from '#database/factories/user_factory'
import { assistantOn, pastConversation, sendMessage } from '#tests/helpers/assistant'

test.group('Shopping assistant conversations', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('the conversation is still there on the next page the shopper opens', async ({
    visit,
    route,
  }) => {
    const product = await ProductFactory.apply('published').with('variants', 1).create()
    const { model } = await assistantOn()
    model.replyWith('We ship nationwide.')

    const home = await visit(route('home'))
    await home.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await sendMessage(home, 'Do you ship to Cebu?')

    const page = await visit(route('products.show', { handle: product.handle }))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()

    const dialog = page.getByRole('dialog', { name: 'Shopping assistant', exact: true })
    await page.assertVisible(dialog.getByText('Do you ship to Cebu?', { exact: true }))
    await page.assertVisible(dialog.getByText('We ship nationwide.', { exact: true }))
  })

  test('New conversation starts an empty thread', async ({ visit, route, db }) => {
    const { model } = await assistantOn()
    model.replyWith('We ship nationwide.')

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await sendMessage(page, 'Do you ship to Cebu?')
    await page.getByRole('button', { name: 'New conversation', exact: true }).click()

    const dialog = page.getByRole('dialog', { name: 'Shopping assistant', exact: true })
    await page.assertVisible(
      dialog.getByText('Conversations may be reviewed by the store.', { exact: true })
    )
    await page.assertNotExists(dialog.getByText('Do you ship to Cebu?', { exact: true }))
    await db.assertCount('assistant_conversations', 2)
  })

  test("a signed-in shopper's past conversations show their titles and when they were last used", async ({
    visit,
    route,
    browserContext,
  }) => {
    const user = await UserFactory.create()
    await pastConversation(user, {
      title: 'Do you ship to Cebu?',
      lastMessageAt: DateTime.now().minus({ days: 2 }),
    })
    await assistantOn()
    await browserContext.loginAs(user)

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await page.getByRole('button', { name: 'Past conversations', exact: true }).click()

    const dialog = page.getByRole('dialog', { name: 'Shopping assistant', exact: true })
    await page.assertVisible(dialog.getByText('Do you ship to Cebu?', { exact: true }))
    await page.assertVisible(dialog.getByText('2 days ago', { exact: true }))
  })

  test("past conversations list only the shopper's own", async ({
    visit,
    route,
    browserContext,
  }) => {
    const user = await UserFactory.create()
    const other = await UserFactory.create()
    await pastConversation(user, {
      title: 'Do you ship to Cebu?',
      lastMessageAt: DateTime.now().minus({ days: 2 }),
    })
    await pastConversation(other, { title: 'Is the lamp dimmable?' })
    await assistantOn()
    await browserContext.loginAs(user)

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await page.getByRole('button', { name: 'Past conversations', exact: true }).click()

    const dialog = page.getByRole('dialog', { name: 'Shopping assistant', exact: true })
    await page.assertVisible(dialog.getByText('Do you ship to Cebu?', { exact: true }))
    await page.assertNotExists(dialog.getByText('Is the lamp dimmable?', { exact: true }))
  })

  test('a signed-out visitor has no past conversations', async ({ visit, route }) => {
    await assistantOn()

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()

    const dialog = page.getByRole('dialog', { name: 'Shopping assistant', exact: true })
    await page.assertVisible(
      dialog.getByText('Conversations may be reviewed by the store.', { exact: true })
    )
    await page.assertNotExists(
      dialog.getByRole('button', { name: 'Past conversations', exact: true })
    )
  })

  test('opening a past conversation shows its messages', async ({
    visit,
    route,
    browserContext,
  }) => {
    const user = await UserFactory.create()
    await pastConversation(user, {
      title: 'Do you ship to Cebu?',
      exchange: ['Do you ship to Cebu?', 'Yes, we ship nationwide.'],
    })
    await assistantOn()
    await browserContext.loginAs(user)

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await page.getByRole('button', { name: 'Past conversations', exact: true }).click()
    await page
      .getByRole('listitem')
      .filter({ hasText: 'Do you ship to Cebu?' })
      .getByRole('button', { name: 'Open', exact: true })
      .click()

    const dialog = page.getByRole('dialog', { name: 'Shopping assistant', exact: true })
    await page.assertVisible(dialog.getByText('Yes, we ship nationwide.', { exact: true }))
  })

  test('deleting a past conversation removes it for good', async ({
    visit,
    route,
    browserContext,
    db,
  }) => {
    const user = await UserFactory.create()
    const conversation = await pastConversation(user, {
      title: 'Do you ship to Cebu?',
      exchange: ['Do you ship to Cebu?', 'Yes, we ship nationwide.'],
    })
    await assistantOn()
    await browserContext.loginAs(user)

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await page.getByRole('button', { name: 'Past conversations', exact: true }).click()
    const row = page.getByRole('listitem').filter({ hasText: 'Do you ship to Cebu?' })
    await row.getByRole('button', { name: 'Delete', exact: true }).click()

    await row.waitFor({ state: 'detached' })
    await page.assertNotExists(page.getByText('Do you ship to Cebu?', { exact: true }))
    await db.assertMissing('assistant_conversations', { id: conversation.id })
    await db.assertMissing('assistant_messages', { conversation_id: conversation.id })
  })

  test('a visitor who signs in continues the same conversation', async ({ visit, route, db }) => {
    const user = await UserFactory.apply('verified').create()
    const { model } = await assistantOn()
    model.replyWith('We ship nationwide.').replyWith("You're welcome.")

    const home = await visit(route('home'))
    await home.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await sendMessage(home, 'Do you ship to Cebu?')

    const login = await visit(route('session.create'))
    await login.getByLabel('Email', { exact: true }).fill(user.email)
    await login.getByLabel('Password', { exact: true }).fill('demo-password')
    await login.getByRole('button', { name: 'Sign in', exact: true }).click()
    await login.assertPath(route('account.show'))

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Shopping assistant', exact: true })
    await dialog.getByText('Do you ship to Cebu?', { exact: true }).waitFor()
    await sendMessage(page, 'Thanks')

    await page.assertVisible(dialog.getByText('Do you ship to Cebu?', { exact: true }))
    await page.assertVisible(dialog.getByText("You're welcome.", { exact: true }))
    await db.assertHas('assistant_conversations', { user_id: user.id }, 1)
  })

  test("after signing out, the account's conversation isn't shown on that browser", async ({
    visit,
    route,
    browserContext,
  }) => {
    const user = await UserFactory.apply('verified').create()
    const { model } = await assistantOn()
    model.replyWith('We ship nationwide.')
    await browserContext.loginAs(user)

    const home = await visit(route('home'))
    await home.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await sendMessage(home, 'Do you ship to Cebu?')

    // The panel sits over the header's right side; close it to reach the user menu.
    await home.getByRole('button', { name: 'Close', exact: true }).click()
    await home.getByRole('button', { name: 'Account', exact: true }).click()
    await home.getByRole('link', { name: 'Log out', exact: true }).click()
    await home.assertPath(route('session.create'))

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()

    const dialog = page.getByRole('dialog', { name: 'Shopping assistant', exact: true })
    await page.assertVisible(
      dialog.getByText('Conversations may be reviewed by the store.', { exact: true })
    )
    await page.assertNotExists(dialog.getByText('Do you ship to Cebu?', { exact: true }))
  })
})

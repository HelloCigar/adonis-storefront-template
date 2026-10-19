import { test, freezeTime } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import User from '#models/account/user'
import { storeStaff } from '#tests/helpers/accounts'
import { finishedStoreSetup } from '#tests/helpers/store_setup'
import { proposalConversation } from '#tests/helpers/assistant'
import {
  copilotProposalConversation,
  deskLamp,
  reviewedConversations,
} from '#tests/helpers/copilot'

test.group('Conversation review', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('the Conversations link shows for {role}: {visible}')
    .with([
      { role: 'admin', visible: true },
      { role: 'staff', visible: false },
    ] as const)
    .run(async ({ visit, route, browserContext }, row) => {
      await finishedStoreSetup()
      const account =
        row.role === 'admin'
          ? await UserFactory.merge({ role: 'admin' }).create()
          : await storeStaff()
      await browserContext.loginAs(account)

      const page = await visit(route('dashboard'))

      await page.assertPath(route('dashboard'))
      const link = page.getByRole('link', { name: 'Conversations', exact: true })
      if (row.visible) await page.assertExists(link)
      else await page.assertNotExists(link)
    })

  test("staff can't open Conversations", async ({ visit, route, browserContext }) => {
    const staff = await storeStaff()
    await browserContext.loginAs(staff)

    const page = await visit(route('seller.conversations.index'))

    await page.assertNotExists(page.getByRole('heading', { name: 'Conversations', exact: true }))
  })

  test("the review list shows both assistants' conversations, newest first", async ({
    visit,
    route,
    browserContext,
  }) => {
    freezeTime(DateTime.now().set({ hour: 12, minute: 0, second: 0 }).toJSDate())
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    await reviewedConversations()
    await browserContext.loginAs(admin)

    const page = await visit(route('seller.conversations.index'))

    await page.assertPath(route('seller.conversations.index'))
    const questions = '[data-testid="conversation-row"]'
    await page.assertText(`${questions} >> nth=0`, 'Which orders need packing?')
    await page.assertText(`${questions} >> nth=1`, 'Do you have lamps?')
    await page.assertText(`${questions} >> nth=2`, 'Do you ship abroad?')
    const rows = page.getByRole('row').filter({ has: page.getByTestId('conversation-row') })
    await page.assertVisible(rows.nth(0).getByText('Copilot', { exact: true }))
    await page.assertVisible(rows.nth(0).getByText('Ana Staff', { exact: true }))
    await page.assertVisible(rows.nth(1).getByText('Shopping', { exact: true }))
    await page.assertVisible(rows.nth(1).getByText('Ben Shopper', { exact: true }))
    await page.assertVisible(rows.nth(2).getByText('Guest', { exact: true }))
  })

  test('filtering by {filter} shows only matching conversations')
    .with([
      { filter: 'assistant', key: 'assistant', matches: 'Which orders need packing?' },
      { filter: 'person', key: 'userId', matches: 'Do you have lamps?' },
      { filter: 'date range', key: 'from', matches: 'Do you have lamps?' },
      { filter: 'Changes applied', key: 'changesApplied', matches: 'Which orders need packing?' },
      { filter: "Couldn't answer", key: 'unanswered', matches: 'Do you ship abroad?' },
    ])
    .run(async ({ visit, route, browserContext, assert }, row) => {
      const middayToday = DateTime.now().set({ hour: 12, minute: 0, second: 0 })
      freezeTime(middayToday.toJSDate())
      const admin = await UserFactory.merge({ role: 'admin' }).create()
      await reviewedConversations()
      await browserContext.loginAs(admin)

      const page = await visit(route('seller.conversations.index'))
      if (row.filter === 'assistant') {
        await page.getByRole('combobox', { name: 'Assistant', exact: true }).click()
        await page.getByRole('option', { name: 'Copilot', exact: true }).click()
      } else if (row.filter === 'person') {
        await page.getByRole('combobox', { name: 'Person', exact: true }).click()
        await page.getByRole('option', { name: 'Ben Shopper', exact: true }).click()
      } else if (row.filter === 'date range') {
        const yesterday = middayToday.minus({ days: 1 })
        await page.getByRole('button', { name: 'Pick a date', exact: true }).click()
        const day = page
          .getByRole('dialog')
          .getByRole('button', { name: yesterday.toFormat('cccc, MMMM d, yyyy'), exact: false })
          .first()
        await day.click()
        await day.click()
      } else {
        await page.getByRole('switch', { name: row.filter, exact: true }).click()
      }

      await page.assertElementsCount('[data-testid="conversation-row"]', 1)
      await page.assertVisible(page.getByText(row.matches, { exact: true }))
      await page.assertPath(route('seller.conversations.index'))
      assert.isTrue(new URL(page.url()).searchParams.has(row.key))
    })

  test("a copilot transcript shows each message and each proposal's changes and outcome", async ({
    visit,
    route,
    browserContext,
  }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    const ana = await User.create({
      fullName: 'Ana Staff',
      email: 'ana@example.com',
      password: 'secret-password',
      role: 'staff',
    })
    const { variant } = await deskLamp()
    const { conversation } = await copilotProposalConversation({
      owner: ana,
      action: 'variant_update',
      outcome: 'applied',
      items: [
        {
          recordId: variant.id,
          label: 'Desk Lamp',
          before: { price: 1200 },
          after: { price: 999 },
        },
      ],
    })
    await browserContext.loginAs(admin)

    const page = await visit(route('seller.conversations.show', { id: conversation.id }))

    await page.assertPath(route('seller.conversations.show', { id: conversation.id }))
    const question = page.getByText('Make the lamp ₱999', { exact: true }).last()
    const reply = page.getByText('Shall I apply it?', { exact: true })
    await page.assertVisible(question)
    await page.assertVisible(reply)
    const [questionBox, replyBox] = [await question.boundingBox(), await reply.boundingBox()]
    if (!questionBox || !replyBox || questionBox.y >= replyBox.y)
      throw new Error('The question should come before the reply')
    await page.assertVisible(page.getByText('Price: ₱1,200.00 → ₱999.00', { exact: true }))
    await page.assertVisible(page.getByText('Applied by Ana Staff', { exact: false }))
    await page.assertNotExists(page.getByRole('button', { name: 'Reply', exact: true }))
    await page.assertNotExists(page.getByRole('button', { name: 'Delete', exact: true }))
  })

  test("a shopping transcript shows an add-to-cart's outcome", async ({
    visit,
    route,
    browserContext,
  }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    const shopper = await User.create({
      fullName: 'Ben Shopper',
      email: 'ben@example.com',
      password: 'secret-password',
      role: 'customer',
    })
    const { variant } = await deskLamp()
    const { conversation, proposal } = await proposalConversation({
      variant,
      quantity: 2,
      owner: shopper,
    })
    proposal.addedAt = DateTime.now()
    await proposal.save()
    await browserContext.loginAs(admin)

    const page = await visit(route('seller.conversations.show', { id: conversation.id }))

    await page.assertPath(route('seller.conversations.show', { id: conversation.id }))
    const card = page.getByTestId('reviewed-cart-proposal')
    await page.assertVisible(card.getByText('Desk Lamp', { exact: true }))
    await page.assertVisible(card.getByText('Qty 2', { exact: true }))
    await page.assertVisible(card.getByText('Added to cart', { exact: true }))
    await page.assertNotExists(page.getByRole('button', { name: 'Add', exact: true }))
  })
})

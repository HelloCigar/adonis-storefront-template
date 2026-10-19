import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import User from '#models/account/user'
import { roleAccount } from '#tests/helpers/accounts'
import { pastConversation } from '#tests/helpers/assistant'
import { deleteUserOnUsersPage, pastCopilotConversation } from '#tests/helpers/copilot'

test.group('Conversations of deleted users', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test("a deleted staff member's copilot conversations stay in review", async ({
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
    await pastCopilotConversation(ana, { title: 'Low stock' })
    await browserContext.loginAs(admin)

    const page = await visit(route('seller.users.index'))
    await deleteUserOnUsersPage(page, ana.email)
    const review = await visit(route('seller.conversations.index'))

    await review.assertPath(route('seller.conversations.index'))
    await review.assertVisible(review.getByText('Low stock', { exact: true }))
    await review.assertVisible(review.getByText('Ana Staff', { exact: true }))
  })

  test("a deleted customer's shopping conversations leave review", async ({
    visit,
    route,
    browserContext,
    db,
  }) => {
    const admin = await UserFactory.merge({ role: 'admin' }).create()
    const customer = await roleAccount('customer')
    await pastConversation(customer, { title: 'Gift ideas' })
    await browserContext.loginAs(admin)

    const page = await visit(route('seller.users.index'))
    await deleteUserOnUsersPage(page, customer.email)
    const review = await visit(route('seller.conversations.index'))

    await review.assertPath(route('seller.conversations.index'))
    await review.assertNotExists(review.getByText('Gift ideas', { exact: true }))
    await db.assertCount('assistant_conversations', 0)
  })
})

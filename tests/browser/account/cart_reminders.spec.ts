import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import { cartReminderUnsubscribeUrl } from '#tests/helpers/cart_reminders'

// Unsubscribe links carry a signature, so these tests visit signed URLs instead of route().
test.group('Cart reminder preferences', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('the emailed link unsubscribes after confirming', async ({ visit, assert }) => {
    const user = await UserFactory.apply('verified').create()

    const page = await visit(cartReminderUnsubscribeUrl(user.id))
    await page.assertVisible(page.getByText('Stop cart reminders?', { exact: true }))
    await user.refresh()
    assert.isNull(user.cartRemindersOptedOutAt)

    await page.getByRole('button', { name: 'Unsubscribe', exact: true }).click()

    await page.assertVisible(
      page.getByText("You won't get cart reminders any more.", { exact: true })
    )
    await user.refresh()
    assert.isNotNull(user.cartRemindersOptedOutAt)
  })

  test('a tampered unsubscribe link changes nothing', async ({ visit, assert }) => {
    const user = await UserFactory.apply('verified').create()

    const page = await visit(`${cartReminderUnsubscribeUrl(user.id)}x`)

    await page.assertVisible(page.getByText('This unsubscribe link has expired.', { exact: true }))
    await user.refresh()
    assert.isNull(user.cartRemindersOptedOutAt)
  })

  test('customers turn cart reminders off and on from Profile', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const user = await UserFactory.apply('verified').create()
    await browserContext.loginAs(user)
    const page = await visit(route('account.profile.show'))
    const toggle = page.getByRole('switch', {
      name: 'Email me about items left in my cart',
      exact: true,
    })

    await toggle.click()
    await page.assertVisible(page.getByText('Cart reminders turned off.', { exact: true }))
    await user.refresh()
    assert.isNotNull(user.cartRemindersOptedOutAt)

    await toggle.click()
    await page.assertVisible(page.getByText('Cart reminders turned on.', { exact: true }))
    await user.refresh()
    assert.isNull(user.cartRemindersOptedOutAt)
  })
})

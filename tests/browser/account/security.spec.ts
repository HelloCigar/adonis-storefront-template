import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'

test.group('Change password', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('can change password and log in with new password', async ({
    visit,
    route,
    browserContext,
  }) => {
    const user = await UserFactory.apply('verified').create()
    await browserContext.loginAs(user)

    const page = await visit(route('account.security.show'))
    await page.getByLabel('Current password', { exact: true }).fill('demo-password')
    await page.getByLabel('New password', { exact: true }).fill('N3w-Purple-Monkey-Dishwasher!')
    await page
      .getByLabel('Confirm new password', { exact: true })
      .fill('N3w-Purple-Monkey-Dishwasher!')
    await page.getByRole('button', { name: 'Update password', exact: true }).click()
    await page.assertVisible(page.getByText('Your password has been updated.', { exact: true }))

    await page.goto(route('account.show'))
    await page.getByRole('link', { name: 'Log out', exact: true }).click()
    await page.assertPath(route('session.create'))

    await page.getByLabel('Email', { exact: true }).fill(user.email)
    await page.getByLabel('Password', { exact: true }).fill('N3w-Purple-Monkey-Dishwasher!')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()

    await page.assertPath(route('account.show'))
  })

  test('sees error with wrong current password', async ({ visit, route, browserContext }) => {
    const user = await UserFactory.apply('verified').create()
    await browserContext.loginAs(user)

    const page = await visit(route('account.security.show'))
    await page.getByLabel('Current password', { exact: true }).fill('wrongpassword')
    await page.getByLabel('New password', { exact: true }).fill('N3w-Purple-Monkey-Dishwasher!')
    await page
      .getByLabel('Confirm new password', { exact: true })
      .fill('N3w-Purple-Monkey-Dishwasher!')
    await page.getByRole('button', { name: 'Update password', exact: true }).click()

    await page.assertVisible(page.getByText('The current password is incorrect.', { exact: true }))
  })
})

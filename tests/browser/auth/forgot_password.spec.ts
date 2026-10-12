import { test } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import PasswordResetProvision from '#mails/auth/password_reset_provision'

test.group('Forgot Password', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('can request password reset email', async ({ visit, route }) => {
    const user = await UserFactory.apply('verified').create()

    using mailFake = mail.fake()

    const page = await visit(route('password_resets.create'))
    await page.getByLabel('Email', { exact: true }).fill(user.email)
    await page.getByRole('button', { name: 'Send instructions', exact: true }).click()
    await page.assertVisible(
      page.getByText('We have sent you the instructions to reset your password', { exact: true })
    )

    mailFake.mails.assertQueued(PasswordResetProvision)
  })

  test('does not reveal whether an email is registered', async ({ visit, route }) => {
    using mailFake = mail.fake()

    const page = await visit(route('password_resets.create'))
    await page.getByLabel('Email', { exact: true }).fill('ghost@example.com')
    await page.getByRole('button', { name: 'Send instructions', exact: true }).click()
    await page.assertVisible(
      page.getByText('We have sent you the instructions to reset your password', { exact: true })
    )

    mailFake.mails.assertNoneQueued()
  })

  test('can reset password and log in', async ({ visit, route }) => {
    const user = await UserFactory.apply('verified').create()
    const token = await user.createPasswordResetToken()

    const page = await visit(route('password_resets.show', { token: token.value!.release() }))
    await page.getByLabel('Password', { exact: true }).fill('N3w-Purple-Monkey-Dishwasher!')
    await page.getByLabel('Confirm password', { exact: true }).fill('N3w-Purple-Monkey-Dishwasher!')
    await page.getByRole('button', { name: 'Reset password', exact: true }).click()
    await page.assertPath(route('session.create'))

    await page.getByLabel('Email', { exact: true }).fill(user.email)
    await page.getByLabel('Password', { exact: true }).fill('N3w-Purple-Monkey-Dishwasher!')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()

    await page.assertPath(route('account.show'))
  })

  test('sees an error with an invalid reset token', async ({ visit, route }) => {
    const page = await visit(route('password_resets.show', { token: 'invalid-token' }))
    await page.getByLabel('Password', { exact: true }).fill('N3w-Purple-Monkey-Dishwasher!')
    await page.getByLabel('Confirm password', { exact: true }).fill('N3w-Purple-Monkey-Dishwasher!')
    await page.getByRole('button', { name: 'Reset password', exact: true }).click()

    await page.assertVisible(
      page.getByText('Invalid or expired password reset token', { exact: true })
    )
  })
})

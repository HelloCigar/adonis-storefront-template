import { test } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import AccountActivationProvision from '#mails/auth/account_activation_provision'

test.group('Email Verification', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('can verify email with valid token', async ({ visit, route }) => {
    const user = await UserFactory.apply('unverified').create()
    const token = await user.createEmailVerificationToken()

    const page = await visit(route('email_verifications.show', { token: token.value!.release() }))
    await page.getByRole('button', { name: 'Verify my email', exact: true }).click()

    await page.assertPath(route('session.create'))
  })

  test('can resend verification email', async ({ visit, route, browserContext }) => {
    const email = 'unverified@example.com'
    const user = await UserFactory.merge({ email, unverifiedEmail: email }).create()
    await browserContext.loginAs(user)

    using mailFake = mail.fake()

    const page = await visit(route('email_verifications.create'))
    await page.getByRole('button', { name: 'Resend activation link', exact: true }).click()
    await page.assertVisible(
      page.getByText('We sent you instructions to verify your email address', { exact: true })
    )

    mailFake.mails.assertQueued(AccountActivationProvision)
  })
})

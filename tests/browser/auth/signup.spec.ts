import { test } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import AccountActivationProvision from '#mails/auth/account_activation_provision'

test.group('Signup', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('can sign up and receive verification email', async ({ visit, route }) => {
    using mailFake = mail.fake()

    const page = await visit(route('new_account.create'))
    await page.getByLabel('Full name', { exact: true }).fill('John Doe')
    await page.getByLabel('Email', { exact: true }).fill('john@example.com')
    await page.getByLabel('Password', { exact: true }).fill('Corr3ct-Horse-Battery-Staple!')
    await page.getByLabel('Confirm password', { exact: true }).fill('Corr3ct-Horse-Battery-Staple!')
    await page.getByRole('button', { name: 'Create account', exact: true }).click()

    await page.assertPath(route('email_verifications.create'))
    mailFake.mails.assertQueued(AccountActivationProvision)
  })

  test('writes the last_login_method cookie after signup', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    using mailFake = mail.fake()

    const page = await visit(route('new_account.create'))
    await page.getByLabel('Full name', { exact: true }).fill('Jane Doe')
    await page.getByLabel('Email', { exact: true }).fill('jane@example.com')
    await page.getByLabel('Password', { exact: true }).fill('Corr3ct-Horse-Battery-Staple!')
    await page.getByLabel('Confirm password', { exact: true }).fill('Corr3ct-Horse-Battery-Staple!')
    await page.getByRole('button', { name: 'Create account', exact: true }).click()
    await page.assertPath(route('email_verifications.create'))

    const lastLoginMethod = await browserContext.getPlainCookie('last_login_method')
    assert.equal(lastLoginMethod, 'email')
    mailFake.mails.assertQueued(AccountActivationProvision)
  })

  test('sees validation error when using existing email', async ({ visit, route }) => {
    const existingUser = await UserFactory.apply('verified').create()

    const page = await visit(route('new_account.create'))
    await page.getByLabel('Full name', { exact: true }).fill('Another User')
    await page.getByLabel('Email', { exact: true }).fill(existingUser.email)
    await page.getByLabel('Password', { exact: true }).fill('Corr3ct-Horse-Battery-Staple!')
    await page.getByLabel('Confirm password', { exact: true }).fill('Corr3ct-Horse-Battery-Staple!')
    await page.getByRole('button', { name: 'Create account', exact: true }).click()

    await page.assertVisible(page.getByText('The email has already been taken', { exact: true }))
  })

  test('sees the password requirements while typing', async ({ visit, route }) => {
    const page = await visit(route('new_account.create'))
    await page.getByLabel('Password', { exact: true }).fill('abc')

    await page.assertVisible(page.getByRole('meter', { name: 'Password strength', exact: true }))
    await page.assertVisible(page.getByText('Very weak', { exact: true }))
    await page.assertVisible(page.getByText('At least 8 characters', { exact: true }))
  })
})

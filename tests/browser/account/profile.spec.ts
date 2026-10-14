import { test } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import EmailChangeProvision from '#mails/auth/email_change_provision'

test.group('Account profile', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('can update first and last name', async ({ visit, route, browserContext }) => {
    const user = await UserFactory.apply('verified').create()
    await browserContext.loginAs(user)

    const page = await visit(route('account.profile.show'))
    await page.getByLabel('First name', { exact: true }).fill('Mina')
    await page.getByLabel('Last name', { exact: true }).fill('Rivera')
    await page.getByRole('button', { name: 'Save changes', exact: true }).click()
    await page.assertVisible(page.getByText('Your profile has been updated.', { exact: true }))

    await page.goto(route('account.show'))
    await page.assertVisible(page.getByRole('heading', { name: 'Hello, Mina', exact: true }))
  })

  test('refuses an empty first name', async ({ visit, route, browserContext }) => {
    const user = await UserFactory.apply('verified').create()
    await browserContext.loginAs(user)

    const page = await visit(route('account.profile.show'))
    await page.getByLabel('First name', { exact: true }).fill('')
    await page.getByRole('button', { name: 'Save changes', exact: true }).click()

    await page.assertPath(route('account.profile.show'))
    await page.assertVisible(page.getByText('The firstName field must be defined', { exact: true }))
  })

  test('changing the email keeps the current one until the new one is verified', async ({
    visit,
    route,
    browserContext,
  }) => {
    const user = await UserFactory.apply('verified').create()
    await browserContext.loginAs(user)

    using mailFake = mail.fake()

    const page = await visit(route('account.profile.show'))
    await page.getByLabel('Email', { exact: true }).fill('newemail@example.com')
    await page.getByRole('button', { name: 'Save changes', exact: true }).click()

    await page.assertVisible(
      page.getByText('Verify your new email address to switch to it.', { exact: true })
    )
    await page.assertVisible(
      page.getByText(`You'll keep signing in with ${user.email}`, { exact: false })
    )
    mailFake.mails.assertQueued(EmailChangeProvision, ({ message }) =>
      message.hasTo('newemail@example.com')
    )
  })

  test('reverting to the original verified email queues no mail', async ({
    visit,
    route,
    browserContext,
  }) => {
    const user = await UserFactory.apply('verified').create()
    user.unverifiedEmail = 'pending@example.com'
    await user.save()
    await browserContext.loginAs(user)

    using mailFake = mail.fake()

    const page = await visit(route('account.profile.show'))
    await page.getByLabel('Email', { exact: true }).fill(user.email)
    await page.getByRole('button', { name: 'Save changes', exact: true }).click()

    await page.assertVisible(page.getByText('Your profile has been updated.', { exact: true }))
    await page.assertNotExists(
      page.getByText('Verify your new email address to switch to it.', { exact: true })
    )
    mailFake.mails.assertNoneQueued()
  })

  test('can resend the pending verification email', async ({ visit, route, browserContext }) => {
    const user = await UserFactory.apply('verified').create()
    user.unverifiedEmail = 'pending@example.com'
    await user.save()
    await browserContext.loginAs(user)

    using mailFake = mail.fake()

    const page = await visit(route('account.profile.show'))
    await page.getByRole('button', { name: 'Resend link', exact: true }).click()
    await page.assertVisible(
      page.getByText('We sent you instructions to verify your email address', { exact: true })
    )

    mailFake.mails.assertQueued(EmailChangeProvision)
  })

  test('can cancel a pending email change', async ({ visit, route, browserContext }) => {
    const user = await UserFactory.apply('verified').create()
    user.unverifiedEmail = 'pending@example.com'
    await user.save()
    await browserContext.loginAs(user)

    using mailFake = mail.fake()

    const page = await visit(route('account.profile.show'))
    await page.getByRole('button', { name: 'Cancel change', exact: true }).click()

    await page.assertVisible(page.getByText('Your profile has been updated.', { exact: true }))
    await page.assertNotExists(
      page.getByText('Verify your new email address to switch to it.', { exact: true })
    )
    mailFake.mails.assertNoneQueued()
  })
})

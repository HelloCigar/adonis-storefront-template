import { test } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/account/user'

test.group('Account authentication', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('signs in without losing the password when its visibility changes', async ({
    visit,
    assert,
    route,
  }) => {
    await User.create({ email: 'auth@example.com', password: 'secret-password', role: 'customer' })
    const page = await visit(route('session.create'))

    await page.getByLabel('Email', { exact: true }).fill('auth@example.com')
    await page.getByLabel('Password', { exact: true }).fill('secret-password')
    await page.getByRole('button', { name: 'Show password', exact: true }).click()
    assert.equal(await page.getByLabel('Password', { exact: true }).inputValue(), 'secret-password')
    assert.equal(await page.getByLabel('Password', { exact: true }).getAttribute('type'), 'text')
    await page.getByRole('button', { name: 'Hide password', exact: true }).press('Space')
    assert.equal(await page.getByLabel('Password', { exact: true }).inputValue(), 'secret-password')
    assert.equal(
      await page.getByLabel('Password', { exact: true }).getAttribute('type'),
      'password'
    )

    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.assertPath(route('account.show'))
  })

  test('shows signup validation and creates an account after correction', async ({
    visit,
    assert,
    route,
  }) => {
    // @ts-ignore -- the fake keeps the signup mail away from a real mailbox
    using mails = mail.fake()

    const page = await visit(route('session.create'))
    await page.getByRole('link', { name: 'Create an account', exact: true }).click()
    await page.assertPath(route('new_account.create'))
    await page.getByLabel('Email', { exact: true }).fill('new-auth@example.com')
    await page.getByLabel('Password', { exact: true }).fill('short')
    await page.getByLabel('Confirm password', { exact: true }).fill('different')
    await page.getByRole('button', { name: 'Create account', exact: true }).click()
    await page.locator('[data-slot="error"]').first().waitFor()
    assert.isNull(await User.findBy('email', 'new-auth@example.com'))
    assert.equal(
      await page.getByLabel('Email', { exact: true }).inputValue(),
      'new-auth@example.com'
    )

    await page.getByLabel('Password', { exact: true }).fill('secret-password')
    await page.getByLabel('Confirm password', { exact: true }).fill('secret-password')
    await page.getByRole('button', { name: 'Show confirm password', exact: true }).click()
    assert.equal(
      await page.getByLabel('Confirm password', { exact: true }).inputValue(),
      'secret-password'
    )
    await page.getByRole('button', { name: 'Hide confirm password', exact: true }).click()
    await page.getByRole('button', { name: 'Create account', exact: true }).click()
    await page.assertPath(route('email_verifications.create'))

    const user = await User.findByOrFail('email', 'new-auth@example.com')
    assert.equal(user.role, 'customer')
    assert.isNull(user.fullName)
  })
})

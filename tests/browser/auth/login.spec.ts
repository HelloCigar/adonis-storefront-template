import { test } from '@japa/runner'
import { UserFactory } from '#database/factories/user_factory'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('Login', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('can log in with valid credentials', async ({ visit, route }) => {
    const user = await UserFactory.apply('verified').create()

    const page = await visit(route('session.create'))
    await page.getByLabel('Email', { exact: true }).fill(user.email)
    await page.getByLabel('Password', { exact: true }).fill('demo-password')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()

    await page.assertPath(route('account.show'))
  })

  test('writes the last_login_method cookie after a successful login', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const user = await UserFactory.apply('verified').create()

    const page = await visit(route('session.create'))
    await page.getByLabel('Email', { exact: true }).fill(user.email)
    await page.getByLabel('Password', { exact: true }).fill('demo-password')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.assertPath(route('account.show'))

    const lastLoginMethod = await browserContext.getPlainCookie('last_login_method')
    assert.equal(lastLoginMethod, 'email')
  })

  test('sees error with invalid credentials', async ({ visit, route }) => {
    const user = await UserFactory.apply('verified').create()

    const page = await visit(route('session.create'))
    await page.getByLabel('Email', { exact: true }).fill(user.email)
    await page.getByLabel('Password', { exact: true }).fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()

    await page.assertVisible(page.getByText('Invalid user credentials', { exact: true }))
  })

  test('can log out', async ({ visit, route, browserContext }) => {
    const user = await UserFactory.apply('verified').create()
    await browserContext.loginAs(user)

    const page = await visit(route('account.show'))
    await page.getByRole('link', { name: 'Log out', exact: true }).click()

    await page.assertPath(route('session.create'))
  })

  test('an unverified account is sent to the activation screen', async ({
    visit,
    route,
    browserContext,
  }) => {
    const user = await UserFactory.apply('unverified').create()
    await browserContext.loginAs(user)

    const page = await visit(route('account.show'))

    await page.assertPath(route('email_verifications.create'))
  })
})

import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'

test.group('Account navigation', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('a customer moves through every account section from the account nav', async ({
    visit,
    route,
    browserContext,
  }) => {
    const user = await UserFactory.apply('verified').create()
    await browserContext.loginAs(user)

    const page = await visit(route('account.show'))
    const nav = page
      .getByRole('navigation')
      .filter({ has: page.getByRole('link', { name: 'Overview', exact: true }) })

    await nav.getByRole('link', { name: 'Orders', exact: true }).click()
    await page.assertPath(route('orders.index'))
    await nav.getByRole('link', { name: 'Addresses', exact: true }).click()
    await page.assertPath(route('account.addresses.index'))
    await nav.getByRole('link', { name: 'Profile', exact: true }).click()
    await page.assertPath(route('account.profile.show'))
    await nav.getByRole('link', { name: 'Security', exact: true }).click()
    await page.assertPath(route('account.security.show'))
    await nav.getByRole('link', { name: 'Overview', exact: true }).click()
    await page.assertPath(route('account.show'))
  })

  test('a customer opening the store settings lands in their account', async ({
    visit,
    route,
    browserContext,
  }) => {
    const user = await UserFactory.apply('verified').create()
    await browserContext.loginAs(user)

    const profile = await visit(route('settings'))
    await profile.assertPath(route('account.profile.show'))

    const security = await visit(route('settings.security'))
    await security.assertPath(route('account.security.show'))
  })

  test('staff keep the store settings area', async ({ visit, route, browserContext }) => {
    const staff = await UserFactory.apply('verified').merge({ role: 'staff' }).create()
    await browserContext.loginAs(staff)

    const page = await visit(route('settings'))
    await page.assertPath(route('settings'))
  })
})

import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'

test.group('Account addresses', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('adding an address keeps the customer on their addresses', async ({
    visit,
    route,
    browserContext,
  }) => {
    const user = await UserFactory.apply('verified').create()
    await browserContext.loginAs(user)

    const page = await visit(route('account.addresses.index'))
    await page.getByRole('button', { name: 'Add address', exact: true }).click()
    await page.getByLabel('Address', { exact: true }).fill('12 Mabini Street')
    await page.getByLabel('Postal code', { exact: true }).fill('1000')
    await page.getByLabel('City', { exact: true }).fill('Manila')
    await page.getByRole('button', { name: 'Save address', exact: true }).click()

    await page.assertVisible(page.getByText('12 Mabini Street', { exact: false }))
    await page.assertPath(route('account.addresses.index'))
  })
})

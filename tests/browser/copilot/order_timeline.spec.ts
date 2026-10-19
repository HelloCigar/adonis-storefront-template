import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import { storeStaff } from '#tests/helpers/accounts'
import { orderShippedViaCopilot } from '#tests/helpers/copilot'

test.group('Copilot changes in the order timeline', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('a timeline entry made through the copilot says "via copilot"', async ({
    visit,
    route,
    browserContext,
  }) => {
    const staff = await storeStaff()
    const { order } = await orderShippedViaCopilot({ owner: staff })
    await browserContext.loginAs(staff)

    const page = await visit(route('seller.orders.show', { id: order.id }))

    await page.assertPath(route('seller.orders.show', { id: order.id }))
    const shipped = page
      .getByRole('listitem')
      .filter({ has: page.getByText('Shipment recorded', { exact: true }) })
    await page.assertVisible(shipped.getByText('via copilot', { exact: true }))
  })

  test('the "via copilot" mark links to the conversation for {role}: {linked}')
    .with([
      { role: 'admin', linked: true },
      { role: 'staff', linked: false },
    ] as const)
    .run(async ({ visit, route, browserContext, assert }, row) => {
      const account =
        row.role === 'admin'
          ? await UserFactory.merge({ role: 'admin' }).create()
          : await storeStaff()
      const { order, conversation } = await orderShippedViaCopilot()
      await browserContext.loginAs(account)

      const page = await visit(route('seller.orders.show', { id: order.id }))

      await page.assertPath(route('seller.orders.show', { id: order.id }))
      const link = page.getByRole('link', { name: 'via copilot', exact: true })
      if (row.linked) {
        await page.assertVisible(link)
        assert.equal(
          await link.getAttribute('href'),
          route('seller.conversations.show', { id: conversation.id })
        )
      } else {
        await page.assertNotExists(link)
        await page.assertVisible(page.getByText('via copilot', { exact: true }))
      }
    })
})

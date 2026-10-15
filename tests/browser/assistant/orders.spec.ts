import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { OrderFactory } from '#database/factories/order_factory'
import { UserFactory } from '#database/factories/user_factory'
import { assistantOn, customerShippedOrder, sendMessage } from '#tests/helpers/assistant'

test.group('Shopping assistant orders', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('a signed-out shopper asking about an order is told to sign in first', async ({
    visit,
    route,
    assert,
  }) => {
    const { model } = await assistantOn()
    model.callTool('listMyOrders', {}, 'Please sign in to see your orders.')

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await sendMessage(page, 'Where is my order?')

    const dialog = page.getByRole('dialog', { name: 'Shopping assistant', exact: true })
    await page.assertVisible(
      dialog.getByText('Please sign in to see your orders.', { exact: true })
    )
    assert.deepEqual(model.toolResult('listMyOrders'), { signInRequired: true })
  })

  test('a signed-in shopper asking about their order gets a link to its order page', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const user = await UserFactory.apply('verified').create()
    const order = await customerShippedOrder(user, { number: 'MB-1001' })
    const { model } = await assistantOn()
    model.callTool('getMyOrder', { orderNumber: 'MB-1001' }, 'Your order has shipped.')
    await browserContext.loginAs(user)

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await sendMessage(page, 'Where is order MB-1001?')

    const link = page
      .getByRole('dialog', { name: 'Shopping assistant', exact: true })
      .getByRole('link', { name: 'Order MB-1001', exact: true })
    await link.waitFor()
    assert.equal(await link.getAttribute('href'), route('orders.show', { id: order.id }))
  })

  test("the assistant receives what the shopper's order page shows", async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const user = await UserFactory.apply('verified').create()
    const order = await customerShippedOrder(user, { number: 'MB-1001' })
    const { model } = await assistantOn()
    model.callTool('getMyOrder', { orderNumber: 'MB-1001' }, 'Your order has shipped.')
    await browserContext.loginAs(user)

    const page = await visit(route('home'))
    await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
    await sendMessage(page, 'Where is order MB-1001?')

    const dialog = page.getByRole('dialog', { name: 'Shopping assistant', exact: true })
    await page.assertVisible(dialog.getByText('Your order has shipped.', { exact: true }))
    await order.refresh()
    assert.containSubset(model.toolResult('getMyOrder'), {
      found: true,
      order: {
        fulfillmentStatus: order.fulfillmentStatus.toUpperCase(),
        tracking: { trackingNumber: 'TRACK-123' },
      },
    })
  })

  test("orders outside the shopper's account look exactly like orders that don't exist")
    .with([
      { owner: 'another customer', number: 'MB-2002' },
      { owner: 'guest order', number: 'MB-3003' },
    ] as const)
    .run(async ({ visit, route, browserContext, assert }, row) => {
      const shopper = await UserFactory.apply('verified').create()
      if (row.owner === 'another customer') {
        const other = await UserFactory.create()
        await OrderFactory.merge({ number: row.number, userId: other.id }).create()
      } else {
        await OrderFactory.merge({
          number: row.number,
          email: shopper.email,
          userId: null,
        }).create()
      }
      const { model } = await assistantOn()
      model.callTool(
        'getMyOrder',
        [{ orderNumber: row.number }, { orderNumber: 'MB-9999' }],
        "I couldn't find that order."
      )
      await browserContext.loginAs(shopper)

      const page = await visit(route('home'))
      await page.getByRole('button', { name: 'Open shopping assistant', exact: true }).click()
      await sendMessage(page, `Where is order ${row.number}?`)

      const dialog = page.getByRole('dialog', { name: 'Shopping assistant', exact: true })
      await page.assertVisible(dialog.getByText("I couldn't find that order.", { exact: true }))
      await page.assertNotExists(
        dialog.getByRole('link', { name: `Order ${row.number}`, exact: true })
      )
      const [asked, missing] = model.toolResults('getMyOrder')
      assert.deepEqual(asked, missing)
    })
})

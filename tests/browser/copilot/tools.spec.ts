import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { UserFactory } from '#database/factories/user_factory'
import AssistantConversation from '#models/assistant/assistant_conversation'
import { storeStaff } from '#tests/helpers/accounts'
import { copilotOn, sendCopilotMessage } from '#tests/helpers/copilot'
import { paidOrder } from '#tests/helpers/delivery'
import { product as stockProduct, variant as stockVariant } from '#tests/helpers/stock_adjustments'

test.group('Copilot tools', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('an order the reply mentions links to its dashboard page', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const staff = await storeStaff()
    const { order } = await paidOrder()
    // A real checkout's order number; the factory's is longer than any the store issues.
    order.number = 'MB-1001'
    await order.save()
    const { model } = await copilotOn()
    model.callTool('getOrder', { orderNumber: order.number }, 'Here it is.')
    await browserContext.loginAs(staff)

    const page = await visit(route('dashboard'))
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
    await sendCopilotMessage(page, `Find order ${order.number}`)

    await page.assertPath(route('dashboard'))
    const link = page
      .locator('[data-copilot-thread]')
      .getByRole('link', { name: order.number, exact: true })
    await page.assertVisible(link)
    assert.equal(await link.getAttribute('href'), route('seller.orders.show', { id: order.id }))
  })

  test('{role} are {offered} users and store-settings data')
    .with([
      { role: 'staff', offered: false },
      { role: 'admins', offered: true },
    ])
    .run(async ({ visit, route, browserContext, assert }, row) => {
      const person =
        row.role === 'staff'
          ? await storeStaff()
          : await UserFactory.merge({ role: 'admin' }).create()
      const { model } = await copilotOn()
      await browserContext.loginAs(person)

      const page = await visit(route('dashboard'))
      await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
      await sendCopilotMessage(page, 'Hello')

      await page.assertPath(route('dashboard'))
      const tools = (model.calls[0].tools ?? []).map((offered) => offered.name)
      for (const name of ['listUsers', 'getStoreSettings']) {
        if (row.offered) assert.include(tools, name)
        else assert.notInclude(tools, name)
      }
    })

  test('product data given to the copilot includes stock counts', async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const staff = await storeStaff()
    const lamp = await stockProduct()
    await stockVariant(lamp, { inventoryQuantity: 37 })
    const { model } = await copilotOn()
    model.callTool('getProduct', { id: lamp.id }, 'Done.')
    await browserContext.loginAs(staff)

    const page = await visit(route('dashboard'))
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
    await sendCopilotMessage(page, 'How many lamps do we have?')

    await page.assertPath(route('dashboard'))
    const result = model.calls[1].prompt.find((message) => message.role === 'tool')
    assert.include(JSON.stringify(result), '"inventoryQuantity":37')
  })

  test('declining an off-topic request offers the suggested questions again', async ({
    visit,
    route,
    browserContext,
  }) => {
    const staff = await storeStaff()
    const { model } = await copilotOn()
    const decline =
      "I can only help with this store's orders, products, customers, content and sales."
    model.callTool('offerSuggestions', {}, decline)
    await browserContext.loginAs(staff)

    const page = await visit(route('dashboard'))
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
    await sendCopilotMessage(page, 'Write me a poem')

    await page.assertPath(route('dashboard'))
    const thread = page.locator('[data-copilot-thread]')
    await page.assertVisible(thread.getByText(decline, { exact: true }))
    for (const question of [
      'What needs my attention today?',
      'Which products are low on stock?',
      'How were sales this week?',
    ])
      await page.assertVisible(thread.getByRole('button', { name: question, exact: true }))
  })

  test("a copilot reply that says it doesn't know flags the conversation as couldn't answer", async ({
    visit,
    route,
    browserContext,
    assert,
  }) => {
    const staff = await storeStaff()
    const { model } = await copilotOn()
    model.callTool('noteUnanswered', {}, "I don't know.")
    await browserContext.loginAs(staff)

    const page = await visit(route('dashboard'))
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()
    await sendCopilotMessage(page, 'What will sales be next year?')

    await page.assertPath(route('dashboard'))
    const conversation = await AssistantConversation.query()
      .where('assistant', 'copilot')
      .firstOrFail()
    assert.isNotNull(conversation.lastUnansweredAt)
  })
})

import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { ProductFactory } from '#database/factories/product_factory'
import { storeStaff } from '#tests/helpers/accounts'
import { copilotOn } from '#tests/helpers/copilot'
import { paidOrder } from '#tests/helpers/delivery'

test.group('Copilot intro', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test("opening the copilot says it's an AI and that admins may review conversations", async ({
    visit,
    route,
    browserContext,
  }) => {
    const staff = await storeStaff()
    await copilotOn()
    await browserContext.loginAs(staff)

    const page = await visit(route('dashboard'))
    await page.getByRole('button', { name: 'Open copilot', exact: true }).click()

    await page.assertPath(route('dashboard'))
    await page.assertVisible(page.getByText('AI', { exact: true }))
    await page.assertVisible(page.getByText('Admins may review conversations.', { exact: true }))
  })

  test('the suggested questions fit the {page} page')
    .with([
      {
        page: 'Home',
        questions: [
          'What needs my attention today?',
          'Which products are low on stock?',
          'How were sales this week?',
        ],
      },
      {
        page: 'order',
        questions: [
          "What's holding this order up?",
          'Has this order been paid?',
          'Summarize this order',
        ],
      },
      {
        page: 'product',
        questions: [
          'How much stock is left?',
          'How is this product selling?',
          'What do reviews say about it?',
        ],
      },
    ])
    .run(async ({ visit, route, browserContext }, row) => {
      const staff = await storeStaff()
      await copilotOn()
      await browserContext.loginAs(staff)

      let url = route('dashboard')
      if (row.page === 'order') {
        const { order } = await paidOrder()
        url = route('seller.orders.show', { id: order.id })
      }
      if (row.page === 'product') {
        const product = await ProductFactory.create()
        url = route('seller.products.show', { id: product.id })
      }

      const page = await visit(url)
      await page.getByRole('button', { name: 'Open copilot', exact: true }).click()

      await page.assertPath(url)
      for (const question of row.questions)
        await page.assertVisible(page.getByRole('button', { name: question, exact: true }))
    })
})

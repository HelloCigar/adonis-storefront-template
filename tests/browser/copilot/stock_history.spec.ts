import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { storeStaff } from '#tests/helpers/accounts'
import { stockAdjustedViaCopilot } from '#tests/helpers/copilot'
import { stockUrl } from '#tests/helpers/stock_adjustments'

test.group('Copilot changes in stock history', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('a stock history row made through the copilot says "via copilot"', async ({
    visit,
    browserContext,
  }) => {
    const staff = await storeStaff()
    const { product, variant } = await stockAdjustedViaCopilot({ owner: staff })
    await browserContext.loginAs(staff)

    const url = stockUrl(product, variant)
    const page = await visit(url)

    await page.assertPath(url)
    // Newest first; the table's header holds a separator row too, so read the body.
    const newest = page
      .getByRole('region', { name: 'History', exact: true })
      .locator('tbody tr')
      .first()
    await page.assertVisible(newest.getByText('via copilot', { exact: true }))
  })
})

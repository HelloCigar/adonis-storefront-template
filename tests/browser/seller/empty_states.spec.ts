import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import ProductReview from '#models/catalog/product_review'
import { ProductFactory } from '#database/factories/product_factory'
import { UserFactory } from '#database/factories/user_factory'

test.group('Store management empty states', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('discounts lead to the first code, then tell no matches apart', async ({
    visit,
    browserContext,
    assert,
    route,
  }) => {
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    await browserContext.loginAs(staff)
    const page = await visit(route('seller.discounts.index'))
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))

    // Nothing exists yet: explain discounts and offer to add one, without an empty table.
    const empty = page.getByTestId('list-empty')
    await empty.getByText('Create your first discount code', { exact: true }).waitFor()
    assert.equal(
      await page.getByRole('textbox', { name: 'Search discounts', exact: true }).count(),
      0
    )
    assert.equal(await page.getByRole('table').count(), 0)

    await empty.getByRole('button', { name: 'Add discount', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Code', { exact: true }).fill('welcome10')
    await dialog.getByLabel('Percent off', { exact: true }).fill('10')
    await dialog.getByRole('button', { name: 'Save', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    await page.getByText('WELCOME10', { exact: true }).waitFor()
    await empty.waitFor({ state: 'detached' })

    // A search that hides every code says so and offers a way back.
    await page.getByRole('textbox', { name: 'Search discounts', exact: true }).fill('summer')
    await page.getByText('No discounts match', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
    await page.getByText('WELCOME10', { exact: true }).waitFor()
    assert.equal(
      await page.getByRole('textbox', { name: 'Search discounts', exact: true }).inputValue(),
      ''
    )

    assert.deepEqual(errors, [])
  })

  test('reviews explain where reviews come from and celebrate an empty queue', async ({
    visit,
    browserContext,
    assert,
    route,
  }) => {
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    await browserContext.loginAs(staff)
    const page = await visit(route('seller.reviews.index'))
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))

    await page.getByText('No reviews yet', { exact: true }).waitFor()
    assert.equal(await page.getByRole('tablist').count(), 0)

    const product = await ProductFactory.apply('published').create()
    const author = await UserFactory.create()
    await ProductReview.create({
      rating: 5,
      title: 'Lovely',
      body: 'Works well.',
      status: 'approved',
      productId: product.id,
      userId: author.id,
    })
    await page.reload()
    await page.getByText('You’re all caught up', { exact: true }).waitFor()
    await page.getByRole('tablist').waitFor()

    assert.deepEqual(errors, [])
  })
})

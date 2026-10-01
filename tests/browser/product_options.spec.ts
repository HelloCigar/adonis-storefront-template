import Product from '#models/product'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

async function createProductOptions() {
  const product = await Product.create({
    title: 'Option test',
    handle: 'option-test',
    status: 'active',
    publishedAt: DateTime.utc(),
  })
  const variants = await product.related('variants').createMany(
    [
      { title: 'Red / Small', options: { Color: 'Red', Size: 'Small' }, availableForSale: true },
      { title: 'Red / Large', options: { Color: 'Red', Size: 'Large' }, availableForSale: false },
      { title: 'Blue / Small', options: { Color: 'Blue', Size: 'Small' }, availableForSale: false },
      { title: 'Blue / Large', options: { Color: 'Blue', Size: 'Large' }, availableForSale: true },
      {
        title: 'Green / Small',
        options: { Color: 'Green', Size: 'Small' },
        availableForSale: false,
      },
      {
        title: 'Green / Large',
        options: { Color: 'Green', Size: 'Large' },
        availableForSale: false,
      },
    ].map((variant, position) => ({ ...variant, position, priceAmount: 49, currencyCode: 'PHP' }))
  )
  return { product, variants }
}

test.group('Product option availability', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('disables sold-out options and keeps available combinations reachable', async ({
    visit,
    assert,
  }) => {
    const { variants } = await createProductOptions()
    const page = await visit('/product/option-test')
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const radio = (name: string) => page.getByRole('radio', { name, exact: true })
    await radio('Red').waitFor()
    assert.isTrue(await radio('Small').isChecked())
    assert.isFalse(await radio('Green').isEnabled())
    assert.isFalse(await radio('Large').isEnabled())
    assert.isTrue(await radio('Blue').isEnabled())

    await page.getByText('Blue', { exact: true }).click()
    await page.assertQueryString({ variantId: String(variants[3].id) })
    assert.isTrue(await radio('Large').isChecked())
    assert.isFalse(await radio('Small').isEnabled())
    assert.isTrue(await page.getByRole('button', { name: 'Add to cart', exact: true }).isEnabled())

    await page.getByText('Red', { exact: true }).click()
    await page.assertQueryString({ variantId: String(variants[0].id) })
    assert.isTrue(await radio('Small').isChecked())
    assert.isFalse(await radio('Large').isEnabled())
    assert.isFalse(await radio('Green').isEnabled())
    assert.deepEqual(errors, [])
  })

  test('allows recovery from a sold-out variant URL', async ({ visit, assert }) => {
    const { variants } = await createProductOptions()
    const page = await visit(`/product/option-test?variantId=${variants[1].id}`)
    await page.getByRole('radio', { name: 'Large', exact: true }).waitFor()
    assert.isTrue(await page.getByRole('radio', { name: 'Large', exact: true }).isChecked())
    assert.isFalse(await page.getByRole('button', { name: 'Sold out', exact: true }).isEnabled())
    assert.isFalse(await page.getByRole('spinbutton').isEnabled())
    await page.getByText('Small', { exact: true }).click()
    await page.assertQueryString({ variantId: String(variants[0].id) })
    assert.isTrue(await page.getByRole('button', { name: 'Add to cart', exact: true }).isEnabled())
    assert.isTrue(await page.getByRole('spinbutton').isEnabled())
  })

  test('disables all options and quantity when every variant is sold out', async ({
    visit,
    assert,
  }) => {
    const { product } = await createProductOptions()
    await product.related('variants').query().update({ availableForSale: false })
    const page = await visit('/product/option-test')
    await page.getByRole('radio', { name: 'Red', exact: true }).waitFor()
    for (const name of ['Red', 'Blue', 'Green', 'Small', 'Large']) {
      assert.isFalse(await page.getByRole('radio', { name, exact: true }).isEnabled())
    }
    assert.isFalse(await page.getByRole('spinbutton').isEnabled())
    assert.isFalse(await page.getByRole('button', { name: 'Sold out', exact: true }).isEnabled())
  })
})

import Product from '#models/catalog/product'
import CartLine from '#models/checkout/cart_line'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

async function createProductOptions() {
  const product = await Product.create({
    title: 'Option test',
    handle: 'option-test',
    optionDefinitions: [
      { name: 'Color', values: ['Red', 'Blue', 'Green'] },
      { name: 'Size', values: ['Small', 'Large'] },
    ],
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

  test('keeps the sellable variant identity when legacy option tuples are duplicated', async ({
    visit,
    assert,
  }) => {
    const product = await Product.create({
      title: 'Legacy duplicate options',
      handle: 'legacy-duplicate-options',
      optionDefinitions: [{ name: 'Color', values: ['Red', 'Blue'] }],
      status: 'active',
      publishedAt: DateTime.utc(),
    })
    await product.related('variants').createMany(
      [
        { title: 'Red', options: { Color: 'Red' }, availableForSale: true },
        { title: 'Sold-out Blue', options: { Color: 'Blue' }, availableForSale: false },
      ].map((variant, position) => ({
        ...variant,
        position,
        priceAmount: 49,
        currencyCode: 'PHP',
      }))
    )
    // Migrated duplicates retain a null combination key; ordinary model writes reject duplicates.
    await db.table('product_variants').insert({
      product_id: product.id,
      title: 'Sellable Blue',
      options: JSON.stringify({ Color: 'Blue' }),
      option_combination_key: null,
      available_for_sale: true,
      position: 2,
      price_amount: 49,
      currency_code: 'PHP',
      created_at: DateTime.utc().toSQL(),
    })
    const sellableBlue = await product
      .related('variants')
      .query()
      .where('position', 2)
      .firstOrFail()
    const page = await visit('/product/legacy-duplicate-options')
    const blue = page.getByRole('radio', { name: 'Blue', exact: true })
    await blue.waitFor()
    assert.isTrue(await blue.isEnabled())

    await page.getByText('Blue', { exact: true }).click()
    await page.assertQueryString({ variantId: String(sellableBlue.id) })
    assert.isTrue(await blue.isChecked())
    assert.isTrue(await page.getByRole('button', { name: 'Add to cart', exact: true }).isEnabled())

    await page.getByRole('button', { name: 'Add to cart', exact: true }).click()
    await page.getByRole('button', { name: 'Open cart', exact: true }).click()
    await page.getByText('Legacy duplicate options - Sellable Blue', { exact: true }).waitFor()
    const line = await CartLine.firstOrFail()
    assert.equal(line.productVariantId, sellableBlue.id)
    assert.equal(await page.getByRole('dialog').locator('img').count(), 0)
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

import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/account/user'
import Product from '#models/catalog/product'
import CartLine from '#models/checkout/cart_line'
import { ProductFactory } from '#database/factories/product_factory'
import { createFixtureImage } from '#database/fixtures/image'
import { mkdir } from 'node:fs/promises'

test.group('Managing product options and images', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('configures shared options, generates missing variants, and assigns their product image', async ({
    visit,
    browserContext,
    assert,
  }) => {
    const staff = await User.create({
      email: 'variant-ui@example.com',
      password: 'secret-password',
      role: 'staff',
    })
    const product = await ProductFactory.apply('published', 'withMedia')
      .merge({
        title: 'Canvas tote',
        handle: 'variant-ui-tote',
        optionDefinitions: [
          { name: 'Color', values: ['Natural', 'Slate'] },
          { name: 'Size', values: ['Small', 'Large'] },
        ],
      })
      .create()
    product.media.add(await createFixtureImage('second-tote-photo'))
    await product.save()
    const images = await product.media.all()
    const original = await product.related('variants').create({
      title: 'Natural / Small',
      options: { Color: 'Natural', Size: 'Small' },
      priceAmount: 799,
      currencyCode: 'PHP',
      inventoryQuantity: 9,
      availableForSale: true,
      sku: 'TOTE-NS',
      position: 0,
    })
    await browserContext.loginAs(staff)
    const page = await visit(`/seller/products/${product.id}`)
    await page.getByRole('button', { name: 'Opt out', exact: true }).click()
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.getByRole('button', { name: 'Edit options', exact: true }).click()
    await page.getByLabel('Option 1 values', { exact: true }).fill('Olive')
    await page.getByLabel('Option 1 values', { exact: true }).press('Enter')
    await page.getByRole('button', { name: 'Save options', exact: true }).click()
    await page.getByRole('button', { name: 'Edit options', exact: true }).waitFor()
    await product.refresh()
    assert.deepEqual(product.optionDefinitions[0].values, ['Natural', 'Slate', 'Olive'])
    await page.getByText('Product options updated', { exact: true }).waitFor({ state: 'hidden' })

    await page.getByRole('button', { name: 'Generate variants', exact: true }).click()
    const generation = page.getByRole('dialog', { name: 'Generate variants', exact: true })
    await generation.getByText('5 new variants', { exact: true }).waitFor()
    await generation.getByLabel('Price', { exact: true }).fill('899')
    await generation.getByLabel('Stock per variant', { exact: true }).fill('12')
    await page.setViewportSize({ width: 1280, height: 900 })
    await mkdir('.impeccable/review', { recursive: true })
    await page.screenshot({
      path: '.impeccable/review/variants-generation.png',
      fullPage: true,
      animations: 'disabled',
    })
    await generation.getByRole('button', { name: 'Create 5 variants', exact: true }).click()
    await generation.waitFor({ state: 'detached' })
    const variants = await product.related('variants').query().orderBy('position')
    assert.lengthOf(variants, 6)
    await original.refresh()
    assert.equal(original.priceAmount, 799)
    assert.equal(original.inventoryQuantity, 9)
    assert.equal(original.sku, 'TOTE-NS')
    await page.getByText('5 variants created', { exact: true }).waitFor({ state: 'hidden' })

    const slate = variants.find(
      (variant) => variant.options?.Color === 'Slate' && variant.options.Size === 'Small'
    )!
    await page.getByRole('button', { name: 'Assign image for Slate / Small', exact: true }).click()
    const editing = page.getByRole('dialog', { name: 'Edit variant', exact: true })
    const imageChoice = editing.getByRole('radio', {
      name: `Image 2: ${images[1].attachment.originalName}`,
      exact: true,
    })
    await imageChoice.focus()
    await imageChoice.press('Space')
    assert.isTrue(await imageChoice.isChecked())
    await page.screenshot({
      path: '.impeccable/review/variants-image-picker.png',
      fullPage: true,
      animations: 'disabled',
    })
    await editing.getByRole('button', { name: 'Save', exact: true }).click()
    await editing.waitFor({ state: 'detached' })
    await slate.refresh()
    assert.equal(slate.featuredMediaId, images[1].id)
    await page.getByText('Variant updated', { exact: true }).waitFor({ state: 'hidden' })
    const row = page.getByRole('row').filter({
      has: page.getByRole('button', { name: 'Assign image for Slate / Small', exact: true }),
    })
    assert.equal(await row.locator('img').count(), 1)

    await page.getByRole('button', { name: 'Generate variants', exact: true }).click()
    await generation.getByText('Every combination already exists', { exact: true }).waitFor()
    await generation
      .getByRole('button', { name: 'Create 0 variants', exact: true })
      .isDisabled()
      .then((disabled) => assert.isTrue(disabled))
    await generation.getByRole('button', { name: 'Cancel', exact: true }).click()
    await generation.waitFor({ state: 'detached' })
    await page.getByRole('heading', { name: 'Canvas tote', exact: true }).waitFor()
    await page.screenshot({
      path: '.impeccable/review/variants-desktop.png',
      fullPage: true,
      animations: 'disabled',
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({
      path: '.impeccable/review/variants-mobile.png',
      fullPage: true,
      animations: 'disabled',
    })
    const pageWidth = await page.locator('html').evaluate((element) => element.scrollWidth)
    assert.isAtMost(pageWidth, 390)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.getByRole('button', { name: 'Edit options', exact: true }).click()
    await page.getByRole('button', { name: 'Remove option 2', exact: true }).click()
    await page.getByRole('button', { name: 'Save options', exact: true }).click()
    await page.getByText(/Removing Size would give/).waitFor()
    await page.screenshot({
      path: '.impeccable/review/variants-removal-error-desktop.png',
      fullPage: true,
      animations: 'disabled',
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({
      path: '.impeccable/review/variants-removal-error-mobile.png',
      fullPage: true,
      animations: 'disabled',
    })
    await product.refresh()
    assert.lengthOf(product.optionDefinitions, 2)
    assert.lengthOf(await product.related('variants').query(), 6)
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await page.setViewportSize({ width: 1280, height: 900 })

    const shop = await visit(`/product/${product.handle}?variantId=${slate.id}`)
    await shop.getByRole('button', { name: 'Add to cart', exact: true }).waitFor()
    await shop.getByRole('button', { name: 'Add to cart', exact: true }).click()
    await shop.getByRole('button', { name: 'Open cart', exact: true }).click()
    await shop.getByRole('heading', { name: 'Your cart', exact: true }).waitFor()
    const line = await CartLine.findByOrFail('productVariantId', slate.id)
    assert.exists(line)
    const cart = shop
      .getByRole('dialog')
      .filter({ has: shop.getByRole('heading', { name: 'Your cart', exact: true }) })
    const cartImageSource = await cart.locator('img').first().getAttribute('src')
    assert.isTrue(cartImageSource?.includes(images[1].attachmentId))
    assert.deepEqual(errors, [])
  })

  test('defines options for a new product and supports its default combination without duplicates', async ({
    visit,
    browserContext,
    assert,
  }) => {
    const staff = await User.create({
      email: 'variant-new@example.com',
      password: 'secret-password',
      role: 'staff',
    })
    const product = await Product.create({ title: 'New mug', handle: 'new-mug', status: 'draft' })
    await browserContext.loginAs(staff)
    const page = await visit(`/seller/products/${product.id}`)
    await page.getByRole('button', { name: 'Define options', exact: true }).click()
    await page.getByRole('button', { name: 'Add option', exact: true }).click()
    await page.getByLabel('Option 1 name', { exact: true }).fill('Finish')
    await page.getByLabel('Option 1 values', { exact: true }).fill('Matte')
    await page.getByLabel('Option 1 values', { exact: true }).press('Enter')
    await page.getByRole('button', { name: 'Save options', exact: true }).click()
    await page.getByRole('button', { name: 'Edit options', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Add variant', exact: true }).click()
    const editing = page.getByRole('dialog', { name: 'Add variant', exact: true })
    await editing.getByLabel('Price', { exact: true }).fill('299')
    await editing.getByRole('button', { name: 'Save', exact: true }).click()
    await editing.waitFor({ state: 'detached' })
    assert.lengthOf(await product.related('variants').query(), 1)
    await page.getByRole('button', { name: 'Add variant', exact: true }).click()
    await editing.getByRole('button', { name: 'Save', exact: true }).click()
    await editing
      .getByText('A variant with this option combination already exists.', { exact: true })
      .waitFor()
    assert.lengthOf(await product.related('variants').query(), 1)
    await editing.getByRole('button', { name: 'Cancel', exact: true }).click()
    await editing.waitFor({ state: 'detached' })
    const original = await product.related('variants').query().firstOrFail()
    await page.getByRole('button', { name: 'Edit options', exact: true }).click()
    assert.isTrue(
      await page.getByRole('button', { name: 'Remove option 1', exact: true }).isEnabled()
    )
    await page.getByRole('button', { name: 'Remove option 1', exact: true }).click()
    await page.getByText(/Removing Finish clears those selections/).waitFor()
    await page.getByRole('button', { name: 'Save options', exact: true }).click()
    await page.getByRole('button', { name: 'Define options', exact: true }).waitFor()
    await product.refresh()
    await original.refresh()
    assert.deepEqual(product.optionDefinitions, [])
    assert.deepEqual(original.options, {})
    assert.equal(original.priceAmount, 299)
    assert.lengthOf(await product.related('variants').query(), 1)
  })
})

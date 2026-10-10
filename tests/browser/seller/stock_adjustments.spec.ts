import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/account/user'
import Product from '#models/catalog/product'
import StockAdjustment from '#models/catalog/stock_adjustment'

test.group('Adjusting variant stock', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('staff add stock from the variants page and see the recorded history', async ({
    visit,
    browserContext,
    assert,
  }) => {
    const staff = await User.create({
      email: 'stock-ui@example.com',
      password: 'secret-password',
      role: 'staff',
    })
    const product = await Product.create({
      title: 'Enamel mug',
      handle: 'stock-ui-mug',
      status: 'active',
    })
    const variant = await product.related('variants').create({
      title: 'Default',
      options: {},
      priceAmount: 299,
      currencyCode: 'PHP',
      inventoryQuantity: 5,
      availableForSale: true,
      sku: 'MUG-1',
      position: 0,
    })
    await browserContext.loginAs(staff)
    const page = await visit(`/seller/products/${product.id}/variants`)
    await page.getByRole('button', { name: 'Actions for Default MUG-1', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Adjust stock', exact: true }).click()

    await page.getByRole('heading', { name: 'Adjust stock', exact: true }).waitFor()
    const onHand = page.locator('dl > div').filter({ hasText: 'On hand' }).first()
    await onHand.getByText('5', { exact: true }).waitFor()
    await page.getByText('No stock changes recorded yet.', { exact: true }).waitFor()

    await page.getByText('Stock received or returned', { exact: true }).click()
    await page.getByLabel('Units', { exact: true }).fill('3')
    await page.getByLabel('Note', { exact: true }).fill('Supplier invoice 1042')
    await page.getByRole('status').getByText('8', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Save adjustment', exact: true }).click()

    await onHand.getByText('8', { exact: true }).waitFor()
    const entry = page.getByRole('row').filter({ hasText: 'Supplier invoice 1042' })
    await entry.getByText('+3', { exact: true }).waitFor()
    await entry.getByText('Received', { exact: true }).waitFor()
    await entry.getByText('5 → 8', { exact: true }).waitFor()

    await variant.refresh()
    assert.equal(variant.inventoryQuantity, 8)
    const adjustments = await StockAdjustment.query().where('productVariantId', variant.id)
    assert.lengthOf(adjustments, 1)
    assert.equal(adjustments[0].quantityBefore, 5)
    assert.equal(adjustments[0].quantityAfter, 8)
    assert.equal(adjustments[0].reason, 'received')
    assert.equal(adjustments[0].note, 'Supplier invoice 1042')
    assert.equal(adjustments[0].actorId, staff.id)
  })

  test('removing more stock than is on hand is rejected without recording a change', async ({
    visit,
    browserContext,
    assert,
  }) => {
    const staff = await User.create({
      email: 'stock-remove-ui@example.com',
      password: 'secret-password',
      role: 'staff',
    })
    const product = await Product.create({
      title: 'Linen apron',
      handle: 'stock-remove-apron',
      status: 'active',
    })
    const variant = await product.related('variants').create({
      title: 'Default',
      options: {},
      priceAmount: 499,
      currencyCode: 'PHP',
      inventoryQuantity: 5,
      availableForSale: true,
      position: 0,
    })
    await browserContext.loginAs(staff)
    const page = await visit(`/seller/products/${product.id}/variants/${variant.id}/stock`)

    await page.getByText('Damaged, lost, or written off', { exact: true }).click()
    await page.getByLabel('Units', { exact: true }).fill('9')
    await page.getByRole('status').getByText('That removes more than the 5 on hand.').waitFor()
    await page.getByRole('button', { name: 'Save adjustment', exact: true }).click()
    await page.getByText(/Stock cannot go below zero/).waitFor()

    await variant.refresh()
    assert.equal(variant.inventoryQuantity, 5)
    assert.lengthOf(await StockAdjustment.query().where('productVariantId', variant.id), 0)
  })
})

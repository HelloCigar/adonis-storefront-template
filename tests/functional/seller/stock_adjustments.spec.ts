import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/account/user'
import Product from '#models/catalog/product'
import type ProductVariant from '#models/catalog/product_variant'
import StockAdjustment from '#models/catalog/stock_adjustment'
import db from '@adonisjs/lucid/services/db'

const staff = () =>
  User.create({ email: 'stock-staff@example.com', password: 'secret-password', role: 'staff' })
const product = (handle = 'stock-product') =>
  Product.create({ title: 'Stock product', handle, status: 'draft' })
const variant = (item: Product, values: Partial<ProductVariant> = {}) =>
  item.related('variants').create({
    title: 'Default',
    priceAmount: 250,
    currencyCode: 'PHP',
    inventoryQuantity: 10,
    availableForSale: true,
    position: 0,
    ...values,
  })
const stockUrl = (item: Product, row: ProductVariant) =>
  `/seller/products/${item.id}/variants/${row.id}/stock`
const variantPayload = {
  title: 'Variant',
  sku: null,
  priceAmount: 250,
  compareAtPriceAmount: null,
  currencyCode: 'PHP',
  inventoryQuantity: 8,
  availableForSale: true,
  featuredMediaId: null,
  options: [],
}

test.group('Stock adjustments', (group) => {
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate()
    return async () => {
      // Held counters are set directly to exercise the guard; clear them so truncation can
      // delete variants past the reserved-stock trigger.
      await db
        .from('product_variants')
        .whereNotExists((query) => {
          query
            .from('stock_reservations')
            .whereColumn('stock_reservations.product_variant_id', 'product_variants.id')
            .where('state', 'reserved')
        })
        .update({ inventory_reserved_quantity: 0 })
      await cleanup()
    }
  })

  test('keeps the stock page and adjustments to store staff', async ({ client, assert }) => {
    const customer = await User.create({
      email: 'stock-customer@example.com',
      password: 'secret-password',
    })
    const item = await product()
    const row = await variant(item)
    const body = { mode: 'add', quantity: 1, reason: 'received' }
    const hidden = await client.get(stockUrl(item, row)).loginAs(customer)
    hidden.assertStatus(403)
    const denied = await client
      .post(stockUrl(item, row))
      .loginAs(customer)
      .withCsrfToken()
      .accept('json')
      .json(body)
    denied.assertStatus(403)
    const guest = await client.post(stockUrl(item, row)).withCsrfToken().json(body).redirects(0)
    guest.assertStatus(302)
    guest.assertHeader('location', '/login')

    const other = await product('other-stock-product')
    const owner = await staff()
    const missing = await client.get(stockUrl(other, row)).loginAs(owner)
    missing.assertStatus(404)
    const mismatched = await client
      .post(stockUrl(other, row))
      .loginAs(owner)
      .withCsrfToken()
      .json(body)
    mismatched.assertStatus(404)
    await row.refresh()
    assert.equal(row.inventoryQuantity, 10)
    assert.lengthOf(await StockAdjustment.all(), 0)
  })

  test('adds, removes, and sets counted stock with a logged entry for each change', async ({
    client,
    assert,
  }) => {
    const owner = await staff()
    const item = await product()
    const row = await variant(item, { availableForSale: false })
    for (const [body, expected] of [
      [{ mode: 'add', quantity: 5, reason: 'received', note: '  PO-1042  ' }, 15],
      [{ mode: 'remove', quantity: 3, reason: 'damaged', note: null }, 12],
      [{ mode: 'set', quantity: 9, reason: 'count' }, 9],
    ] as const) {
      const response = await client
        .post(stockUrl(item, row))
        .loginAs(owner)
        .withCsrfToken()
        .json(body)
      response.assertRedirectsTo(stockUrl(item, row))
      await row.refresh()
      assert.equal(row.inventoryQuantity, expected)
    }
    // Adjusting stock never changes whether staff marked the variant for sale.
    assert.isFalse(row.availableForSale)

    const entries = await StockAdjustment.query().orderBy('id')
    assert.deepEqual(
      entries.map((entry) => [
        entry.reason,
        entry.quantityBefore,
        entry.quantityAfter,
        entry.change,
        entry.note,
        entry.actorId,
        entry.productVariantId,
      ]),
      [
        ['received', 10, 15, 5, 'PO-1042', owner.id, row.id],
        ['damaged', 15, 12, -3, null, owner.id, row.id],
        ['count', 12, 9, -3, null, owner.id, row.id],
      ]
    )

    const page = await client.get(stockUrl(item, row)).loginAs(owner).withInertia()
    page.assertStatus(200)
    assert.equal(page.inertiaProps.variant.inventoryQuantity, 9)
    assert.deepEqual(page.inertiaProps.reasons, [
      'received',
      'returned',
      'count',
      'damaged',
      'lost',
      'correction',
    ])
    assert.deepEqual(
      page.inertiaProps.adjustments.data.map((entry: { change: number }) => entry.change),
      [-3, -3, 5]
    )
    assert.deepInclude(page.inertiaProps.adjustments.data[2], {
      reason: 'received',
      quantityBefore: 10,
      quantityAfter: 15,
      note: 'PO-1042',
      actorName: owner.email,
    })
    assert.equal(page.inertiaProps.adjustments.metadata.total, 3)
  })

  test('rejects changes that break the stock invariant without writing', async ({
    client,
    assert,
  }) => {
    const owner = await staff()
    const item = await product()
    const held = await variant(item, { inventoryQuantity: 6, inventoryReservedQuantity: 4 })
    const untracked = await variant(item, {
      title: 'Untracked',
      inventoryQuantity: null,
      position: 1,
    })
    for (const [row, body, message] of [
      [held, { mode: 'remove', quantity: 7, reason: 'lost' }, 'Stock cannot go below zero'],
      [held, { mode: 'remove', quantity: 3, reason: 'lost' }, 'held by pending orders'],
      [held, { mode: 'set', quantity: 3, reason: 'count' }, 'Keep at least 4'],
      [held, { mode: 'set', quantity: 6, reason: 'count' }, 'Stock is already 6'],
      [held, { mode: 'add', quantity: 0, reason: 'received' }, 'how many units'],
      [held, { mode: 'add', quantity: 99999999, reason: 'received' }, 'cannot exceed'],
      [untracked, { mode: 'add', quantity: 1, reason: 'received' }, 'does not track stock'],
    ] as const) {
      const response = await client
        .post(stockUrl(item, row))
        .loginAs(owner)
        .withCsrfToken()
        .accept('json')
        .json(body)
      response.assertStatus(422)
      assert.equal(response.body().errors[0].field, 'quantity')
      assert.include(response.body().errors[0].message, message)
    }
    for (const body of [
      { mode: 'add', quantity: -2, reason: 'received' },
      { mode: 'add', quantity: 1.5, reason: 'received' },
      { mode: 'add', quantity: 1, reason: 'edited' },
      { mode: 'adjust', quantity: 1, reason: 'received' },
      { mode: 'add', quantity: 1, reason: 'received', note: 'x'.repeat(501) },
    ]) {
      const invalid = await client
        .post(stockUrl(item, held))
        .loginAs(owner)
        .withCsrfToken()
        .accept('json')
        .json(body)
      invalid.assertStatus(422)
    }
    await held.refresh()
    assert.equal(held.inventoryQuantity, 6)
    assert.equal(held.inventoryReservedQuantity, 4)
    await untracked.refresh()
    assert.isNull(untracked.inventoryQuantity)
    assert.lengthOf(await StockAdjustment.all(), 0)

    const allowed = await client
      .post(stockUrl(item, held))
      .loginAs(owner)
      .withCsrfToken()
      .json({ mode: 'set', quantity: 4, reason: 'count' })
    allowed.assertRedirectsTo(stockUrl(item, held))
    await held.refresh()
    assert.equal(held.inventoryQuantity, 4)
  })

  test('logs stock set through the variant form and generation', async ({ client, assert }) => {
    const owner = await staff()
    const item = await product()
    const created = await client
      .post(`/seller/products/${item.id}/variants`)
      .loginAs(owner)
      .withCsrfToken()
      .json(variantPayload)
    created.assertRedirectsTo(`/seller/products/${item.id}/variants`)
    const row = await item.related('variants').query().firstOrFail()
    const update = (inventoryQuantity: number | null, title = 'Variant') =>
      client
        .patch(`/seller/products/${item.id}/variants/${row.id}`)
        .loginAs(owner)
        .withCsrfToken()
        .json({ ...variantPayload, title, inventoryQuantity })
    for (const [quantity, title] of [
      [8, 'Renamed'],
      [11, 'Variant'],
      [null, 'Variant'],
    ] as const) {
      const updated = await update(quantity, title)
      updated.assertRedirectsTo(`/seller/products/${item.id}/variants`)
    }

    const untracked = await product('untracked-stock-product')
    const blank = await client
      .post(`/seller/products/${untracked.id}/variants`)
      .loginAs(owner)
      .withCsrfToken()
      .json({ ...variantPayload, inventoryQuantity: null })
    blank.assertRedirectsTo(`/seller/products/${untracked.id}/variants`)

    const generated = await product('generated-stock-product')
    generated.optionDefinitions = [{ name: 'Color', values: ['Blue', 'Red'] }]
    await generated.save()
    const generation = await client
      .post(`/seller/products/${generated.id}/variants/generate`)
      .loginAs(owner)
      .withCsrfToken()
      .json({
        priceAmount: 250,
        compareAtPriceAmount: null,
        currencyCode: 'PHP',
        inventoryQuantity: 4,
        availableForSale: true,
      })
    generation.assertRedirectsTo(`/seller/products/${generated.id}/variants`)

    const entries = await StockAdjustment.query().orderBy('id')
    assert.deepEqual(
      entries.map((entry) => [
        entry.productVariantId === row.id,
        entry.reason,
        entry.quantityBefore,
        entry.quantityAfter,
        entry.actorId,
      ]),
      [
        [true, 'initial', null, 8, owner.id],
        [true, 'edited', 8, 11, owner.id],
        [true, 'edited', 11, null, owner.id],
        [false, 'initial', null, 4, owner.id],
        [false, 'initial', null, 4, owner.id],
      ]
    )
  })

  test('pages the history newest first and removes it with the variant', async ({
    client,
    assert,
  }) => {
    const owner = await staff()
    const item = await product()
    const row = await variant(item, { inventoryQuantity: 0 })
    await StockAdjustment.createMany(
      Array.from({ length: 30 }, (_, index) => ({
        productVariantId: row.id,
        actorId: owner.id,
        reason: 'received' as const,
        quantityBefore: index,
        quantityAfter: index + 1,
      }))
    )
    const first = await client.get(stockUrl(item, row)).loginAs(owner).withInertia()
    assert.lengthOf(first.inertiaProps.adjustments.data, 25)
    assert.equal(first.inertiaProps.adjustments.data[0].quantityAfter, 30)
    const second = await client
      .get(`${stockUrl(item, row)}?page=2`)
      .loginAs(owner)
      .withInertia()
    assert.lengthOf(second.inertiaProps.adjustments.data, 5)
    assert.equal(second.inertiaProps.adjustments.data[4].quantityAfter, 1)
    assert.equal(second.inertiaProps.adjustments.metadata.currentPage, 2)

    await owner.delete()
    const kept = await StockAdjustment.query().where('productVariantId', row.id)
    assert.lengthOf(kept, 30)
    assert.isTrue(kept.every((entry) => entry.actorId === null))
    await row.delete()
    assert.lengthOf(await StockAdjustment.all(), 0)
  })
})

import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/account/user'
import Product from '#models/catalog/product'
import ProductVariant from '#models/catalog/product_variant'
import db from '@adonisjs/lucid/services/db'
import { attachmentManager } from '@jrmc/adonis-attachment'
import { DateTime } from 'luxon'
import { optionCombinationKey } from '#services/catalog/options_service'
import { inferLegacyOptionDefinitions } from '../../database/migrations/1791150000000_add_product_options.js'

const staff = () =>
  User.create({ email: 'variants-staff@example.com', password: 'secret-password', role: 'staff' })
const product = (optionDefinitions: Product['optionDefinitions'] = []) =>
  Product.create({
    title: 'Options product',
    handle: 'options-product',
    status: 'draft',
    optionDefinitions,
  })
const defaults = {
  priceAmount: 250,
  compareAtPriceAmount: null,
  currencyCode: 'PHP',
  inventoryQuantity: 8,
  availableForSale: true,
}
const payload = (options: { name: string; value: string }[] = []) => ({
  ...defaults,
  title: 'Variant',
  sku: null,
  featuredMediaId: null,
  options,
})
const colorDefinitions = [{ name: 'Color', values: ['Blue', 'Red'] }]
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/vXcAAAAASUVORK5CYII=',
  'base64'
)

test.group('Product options and variants', (group) => {
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate()
    return async () => {
      // These tests assign artificial held counters solely to verify preservation.
      // Clear only this fixture's counters when no real reservation needs releasing.
      await db
        .from('product_variants')
        .whereIn('product_id', db.from('products').where('handle', 'options-product').select('id'))
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

  test('protects option configuration and generation from customers', async ({
    client,
    assert,
  }) => {
    const customer = await User.create({
      email: 'customer@example.com',
      password: 'secret-password',
    })
    const item = await product()
    for (const [method, path] of [
      ['patch', `/seller/products/${item.id}/options`],
      ['post', `/seller/products/${item.id}/variants/generate`],
    ] as const) {
      const denied = await client[method](path)
        .loginAs(customer)
        .withCsrfToken()
        .accept('json')
        .json({})
      denied.assertStatus(403)
      const guest = await client[method](path).withCsrfToken().json({}).redirects(0)
      guest.assertStatus(302)
      guest.assertHeader('location', '/login')
    }
    assert.lengthOf(await item.related('variants').query(), 0)
  })

  test('rejects invalid shared dimensions and duplicate variant combinations', async ({
    client,
    assert,
  }) => {
    const owner = await staff()
    const item = await product(colorDefinitions)
    for (const options of [
      [],
      [{ name: 'Size', value: 'Small' }],
      [{ name: 'Color', value: 'Green' }],
      [
        { name: 'Color', value: 'Blue' },
        { name: 'Color', value: 'Red' },
      ],
    ]) {
      const invalid = await client
        .post(`/seller/products/${item.id}/variants`)
        .loginAs(owner)
        .withCsrfToken()
        .accept('json')
        .json(payload(options))
      invalid.assertStatus(422)
      assert.equal(invalid.body().errors[0].field, 'options')
    }
    const blue = [{ name: 'Color', value: 'Blue' }]
    const added = await client
      .post(`/seller/products/${item.id}/variants`)
      .loginAs(owner)
      .withCsrfToken()
      .json(payload(blue))
    added.assertRedirectsTo(`/seller/products/${item.id}/variants`)
    const first = await item.related('variants').query().firstOrFail()
    const duplicate = await client
      .post(`/seller/products/${item.id}/variants`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json(payload(blue))
    duplicate.assertStatus(422)
    assert.equal(duplicate.body().errors[0].field, 'options')
    const red = await item
      .related('variants')
      .create({ ...defaults, title: 'Red', options: { Color: 'Red' }, position: 1 })
    const updated = await client
      .patch(`/seller/products/${item.id}/variants/${red.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json(payload(blue))
    updated.assertStatus(422)
    await red.refresh()
    assert.deepEqual(red.options, { Color: 'Red' })
    assert.lengthOf(await item.related('variants').query(), 2)
    const same = await client
      .patch(`/seller/products/${item.id}/variants/${first.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .json(payload(blue))
    same.assertRedirectsTo(`/seller/products/${item.id}/variants`)
  })

  test('allows only one default combination and protects combinations at the database boundary', async ({
    client,
    assert,
  }) => {
    const owner = await staff()
    const item = await product()
    const created = await client
      .post(`/seller/products/${item.id}/variants`)
      .loginAs(owner)
      .withCsrfToken()
      .json(payload())
    created.assertRedirectsTo(`/seller/products/${item.id}/variants`)
    const duplicate = await client
      .post(`/seller/products/${item.id}/variants`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json(payload())
    duplicate.assertStatus(422)
    await assert.rejects(
      () =>
        item
          .related('variants')
          .create({ ...defaults, title: 'Duplicate default', options: {}, position: 1 }),
      /UNIQUE/
    )
    assert.lengthOf(await item.related('variants').query(), 1)
  })

  test('uses the product definitions on the storefront, including allowed values without variants', async ({
    client,
    assert,
  }) => {
    const item = await product(colorDefinitions)
    item.merge({ status: 'active', publishedAt: DateTime.utc() })
    await item.save()
    await item
      .related('variants')
      .create({ ...defaults, title: 'Blue', options: { Color: 'Blue' }, position: 0 })
    const page = await client.get(`/product/${item.handle}`).withInertia()
    page.assertStatus(200)
    assert.deepInclude(page.inertiaProps.product.options[0], {
      name: 'Color',
      values: ['Blue', 'Red'],
    })
    assert.lengthOf(page.inertiaProps.product.variants, 1)
  })

  test('generates only missing combinations and preserves existing variant business data', async ({
    client,
    assert,
  }) => {
    const owner = await staff()
    const item = await product([...colorDefinitions, { name: 'Size', values: ['Small', 'Large'] }])
    item.status = 'active'
    await item.save()
    const first = await item.related('variants').create({
      ...defaults,
      priceAmount: 99,
      inventoryQuantity: 12,
      inventoryReservedQuantity: 3,
      sku: 'KEEP-SKU',
      title: 'Keep title',
      options: { Color: 'Blue', Size: 'Small' },
      position: 0,
    })
    for (const priceAmount of [300, 800]) {
      const generated = await client
        .post(`/seller/products/${item.id}/variants/generate`)
        .loginAs(owner)
        .withCsrfToken()
        .json({ ...defaults, priceAmount, inventoryQuantity: 4 })
      generated.assertRedirectsTo(`/seller/products/${item.id}/variants`)
    }
    const variants = await item.related('variants').query().orderBy('position')
    assert.lengthOf(variants, 4)
    await first.refresh()
    assert.equal(first.priceAmount, 99)
    assert.equal(first.inventoryQuantity, 12)
    assert.equal(first.inventoryReservedQuantity, 3)
    assert.equal(first.sku, 'KEEP-SKU')
    assert.equal(first.title, 'Keep title')
    assert.deepEqual(first.options, { Color: 'Blue', Size: 'Small' })
    assert.isTrue(
      variants
        .slice(1)
        .every((variant) => variant.priceAmount === 300 && variant.inventoryQuantity === 4)
    )
    await item.refresh()
    assert.isNotNull(item.publishedAt)
    const wrongCurrency = await client
      .post(`/seller/products/${item.id}/variants/generate`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json({ ...defaults, currencyCode: 'USD' })
    wrongCurrency.assertStatus(422)
  })

  test('bounds generation and rejects invalid default prices without partial writes', async ({
    client,
    assert,
  }) => {
    const owner = await staff()
    const item = await product([
      { name: 'Color', values: Array.from({ length: 11 }, (_, index) => `Color ${index}`) },
      { name: 'Size', values: Array.from({ length: 10 }, (_, index) => `Size ${index}`) },
    ])
    const tooMany = await client
      .post(`/seller/products/${item.id}/variants/generate`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json(defaults)
    tooMany.assertStatus(422)
    assert.include(tooMany.body().errors[0].message, '100')
    const invalidPrice = await client
      .post(`/seller/products/${item.id}/variants/generate`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json({ ...defaults, compareAtPriceAmount: 1 })
    invalidPrice.assertStatus(422)
    assert.lengthOf(await item.related('variants').query(), 0)
  })

  test('adds dimensions using the first value, permits unused removals, and rejects unsafe schema edits', async ({
    client,
    assert,
  }) => {
    const owner = await staff()
    const item = await product(colorDefinitions)
    const first = await item.related('variants').create({
      ...defaults,
      title: 'Blue',
      sku: 'KEEP',
      options: { Color: 'Blue' },
      inventoryReservedQuantity: 2,
      position: 0,
    })
    const image = await attachmentManager.createFromBuffer(png, {
      originalName: 'blue.png',
      mimeType: 'image/png',
    })
    item.media.addMany([image])
    await item.save()
    const [link] = await item.media.all()
    first.featuredMediaId = link.id
    await first.save()
    const definitions = [{ name: 'Size', values: ['Small', 'Large'] }, ...colorDefinitions]
    const updated = await client
      .patch(`/seller/products/${item.id}/options`)
      .loginAs(owner)
      .withCsrfToken()
      .json({ optionDefinitions: definitions })
    updated.assertRedirectsTo(`/seller/products/${item.id}/variants`)
    await first.refresh()
    assert.deepEqual(first.options, { Color: 'Blue', Size: 'Small' })
    assert.equal(first.featuredMediaId, link.id)
    assert.equal(first.inventoryReservedQuantity, 2)
    assert.equal(first.inventoryQuantity, defaults.inventoryQuantity)
    assert.equal(first.sku, 'KEEP')
    const unusedRemoved = [
      { name: 'Color', values: ['Blue'] },
      { name: 'Size', values: ['Small'] },
    ]
    const reordered = await client
      .patch(`/seller/products/${item.id}/options`)
      .loginAs(owner)
      .withCsrfToken()
      .json({ optionDefinitions: unusedRemoved })
    reordered.assertRedirectsTo(`/seller/products/${item.id}/variants`)
    for (const optionDefinitions of [
      [
        { name: 'Color', values: ['Red'] },
        { name: 'Size', values: ['Small'] },
      ],
      [
        { name: 'Color', values: ['Blue', 'blue'] },
        { name: 'Size', values: ['Small'] },
      ],
      [
        { name: 'Color', values: ['Blue'] },
        { name: 'color', values: ['Blue'] },
      ],
    ]) {
      const invalid = await client
        .patch(`/seller/products/${item.id}/options`)
        .loginAs(owner)
        .withCsrfToken()
        .accept('json')
        .json({ optionDefinitions })
      invalid.assertStatus(422)
    }
    await item.refresh()
    assert.deepEqual(item.optionDefinitions, unusedRemoved)
    const persistedVariant = await ProductVariant.findOrFail(first.id)
    assert.equal(persistedVariant.priceAmount, defaults.priceAmount)
    for (const optionDefinitions of [[{ name: 'Color', values: ['Blue'] }], []]) {
      const removed = await client
        .patch(`/seller/products/${item.id}/options`)
        .loginAs(owner)
        .withCsrfToken()
        .json({ optionDefinitions })
      removed.assertRedirectsTo(`/seller/products/${item.id}/variants`)
      await first.refresh()
      assert.deepEqual(first.options, optionDefinitions.length ? { Color: 'Blue' } : {})
      assert.equal(first.featuredMediaId, link.id)
      assert.equal(first.inventoryReservedQuantity, 2)
      assert.equal(first.inventoryQuantity, defaults.inventoryQuantity)
      assert.equal(first.priceAmount, defaults.priceAmount)
      assert.equal(first.sku, 'KEEP')
      assert.equal(first.optionCombinationKey, optionCombinationKey(first.options))
    }
    await item.refresh()
    assert.deepEqual(item.optionDefinitions, [])
    assert.lengthOf(await item.related('variants').query(), 1)
  })

  test('removes a used dimension only when projected combinations stay distinct', async ({
    client,
    assert,
  }) => {
    const owner = await staff()
    const definitions = [...colorDefinitions, { name: 'Size', values: ['Small', 'Large'] }]
    const item = await product(definitions)
    const variants = await item.related('variants').createMany([
      {
        ...defaults,
        title: 'Blue / Small',
        sku: 'BLUE-S',
        position: 0,
        options: { Color: 'Blue', Size: 'Small' },
      },
      {
        ...defaults,
        title: 'Red / Large',
        sku: 'RED-L',
        position: 1,
        options: { Color: 'Red', Size: 'Large' },
      },
    ])
    const removed = await client
      .patch(`/seller/products/${item.id}/options`)
      .loginAs(owner)
      .withCsrfToken()
      .json({ optionDefinitions: [definitions[1]] })
    removed.assertRedirectsTo(`/seller/products/${item.id}/variants`)
    for (const [index, size] of ['Small', 'Large'].entries()) {
      await variants[index].refresh()
      assert.deepEqual(variants[index].options, { Size: size })
      assert.equal(variants[index].sku, index === 0 ? 'BLUE-S' : 'RED-L')
      assert.equal(variants[index].priceAmount, defaults.priceAmount)
      assert.equal(variants[index].inventoryQuantity, defaults.inventoryQuantity)
    }
    const before = await db.from('product_variants').where('product_id', item.id).orderBy('id')
    const collision = await client
      .patch(`/seller/products/${item.id}/options`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json({ optionDefinitions: [] })
    collision.assertStatus(422)
    const message = collision.body().errors[0].message
    assert.include(message, 'Removing Size')
    assert.include(message, `"Blue / Small" (#${variants[0].id})`)
    assert.include(message, `"Red / Large" (#${variants[1].id})`)
    assert.include(message, 'same Default combination')
    assert.deepEqual(
      await db.from('product_variants').where('product_id', item.id).orderBy('id'),
      before
    )
    await item.refresh()
    assert.deepEqual(item.optionDefinitions, [definitions[1]])
  })

  test('preserves legacy selections when an option is added during removal or repair', async ({
    client,
    assert,
  }) => {
    const owner = await staff()
    const item = await product([
      { name: 'Color', values: ['Blue'] },
      { name: 'Size', values: ['Small'] },
    ])
    const legacy = await item.related('variants').create({
      ...defaults,
      title: 'Silk selection',
      sku: 'KEEP-SILK',
      options: { Color: 'Blue', Size: 'Small', Material: 'Silk' },
      position: 0,
    })
    const replaced = await client
      .patch(`/seller/products/${item.id}/options`)
      .loginAs(owner)
      .withCsrfToken()
      .json({
        optionDefinitions: [
          { name: 'Color', values: ['Blue'] },
          { name: 'Material', values: ['Cotton', 'Silk'] },
        ],
      })
    replaced.assertRedirectsTo(`/seller/products/${item.id}/variants`)
    await legacy.refresh()
    assert.deepEqual(legacy.options, { Color: 'Blue', Material: 'Silk' })
    assert.equal(legacy.sku, 'KEEP-SILK')
    assert.equal(legacy.priceAmount, defaults.priceAmount)
    assert.equal(legacy.inventoryQuantity, defaults.inventoryQuantity)

    const repairItem = await Product.create({
      title: 'Legacy expansion',
      handle: 'legacy-expansion',
      status: 'draft',
      optionDefinitions: [{ name: 'Color', values: ['Blue'] }],
    })
    const [missingSize, historicalSize] = await repairItem.related('variants').createMany([
      { ...defaults, title: 'No Size', options: { Color: 'Blue' }, position: 0 },
      {
        ...defaults,
        title: 'Small selection',
        options: { Color: 'Blue', Size: 'Small' },
        position: 1,
      },
    ])
    const before = await db
      .from('product_variants')
      .where('product_id', repairItem.id)
      .orderBy('id')
    const expanded = await client
      .patch(`/seller/products/${repairItem.id}/options`)
      .loginAs(owner)
      .withCsrfToken()
      .json({
        optionDefinitions: [
          { name: 'Color', values: ['Blue'] },
          { name: 'Size', values: ['Small', 'Large'] },
        ],
      })
    expanded.assertRedirectsTo(`/seller/products/${repairItem.id}/variants`)
    assert.deepEqual(
      await db.from('product_variants').where('product_id', repairItem.id).orderBy('id'),
      before
    )
    const repaired = await client
      .patch(`/seller/products/${repairItem.id}/variants/${missingSize.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .json(
        payload([
          { name: 'Color', value: 'Blue' },
          { name: 'Size', value: 'Large' },
        ])
      )
    repaired.assertRedirectsTo(`/seller/products/${repairItem.id}/variants`)
    await historicalSize.refresh()
    assert.deepEqual(historicalSize.options, { Color: 'Blue', Size: 'Small' })
    const page = await client
      .get(`/seller/products/${repairItem.id}/variants`)
      .loginAs(owner)
      .withInertia()
    assert.lengthOf(page.inertiaProps.product.optionIssues, 0)
  })

  test('removal cannot merge a distinct tuple into an existing legacy duplicate group', async ({
    client,
    assert,
  }) => {
    const owner = await staff()
    const item = await product([...colorDefinitions, { name: 'Size', values: ['Small'] }])
    await item.related('variants').createMany([
      {
        ...defaults,
        title: 'Blue / Small',
        options: { Color: 'Blue', Size: 'Small' },
        position: 0,
      },
      { ...defaults, title: 'Red / Small', options: { Color: 'Red', Size: 'Small' }, position: 2 },
    ])
    await db.table('product_variants').insert({
      product_id: item.id,
      title: 'Legacy duplicate Blue',
      options: JSON.stringify({ Color: 'Blue', Size: 'Small' }),
      option_combination_key: null,
      position: 1,
      price_amount: 101,
      currency_code: 'PHP',
      created_at: DateTime.utc().toSQL(),
    })
    const before = await db.from('product_variants').where('product_id', item.id).orderBy('id')
    const blocked = await client
      .patch(`/seller/products/${item.id}/options`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json({ optionDefinitions: [{ name: 'Size', values: ['Small'] }] })
    blocked.assertStatus(422)
    assert.include(blocked.body().errors[0].message, 'Removing Color')
    assert.deepEqual(
      await db.from('product_variants').where('product_id', item.id).orderBy('id'),
      before
    )
  })

  test('preserves legacy duplicates, reports repair issues, and repairs individual variants', async ({
    client,
    assert,
  }) => {
    const owner = await staff()
    const item = await product(colorDefinitions)
    const first = await item
      .related('variants')
      .create({ ...defaults, title: 'Blue', options: { Color: 'Blue' }, position: 0 })
    await db.table('product_variants').insert({
      product_id: item.id,
      title: 'Legacy duplicate',
      options: JSON.stringify({ Color: 'Blue' }),
      price_amount: 101,
      currency_code: 'PHP',
      inventory_quantity: 7,
      inventory_reserved_quantity: 1,
      available_for_sale: true,
      position: 1,
      created_at: DateTime.utc().toSQL(),
      option_combination_key: null,
    })
    const duplicate = await item.related('variants').query().whereNot('id', first.id).firstOrFail()
    const page = await client
      .get(`/seller/products/${item.id}/variants`)
      .loginAs(owner)
      .withInertia()
    assert.deepInclude(page.inertiaProps.product.optionIssues[0], {
      kind: 'duplicate',
      variantId: duplicate.id,
    })
    const blocked = await client
      .post(`/seller/products/${item.id}/variants/generate`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json(defaults)
    blocked.assertStatus(422)
    const added = await client
      .patch(`/seller/products/${item.id}/options`)
      .loginAs(owner)
      .withCsrfToken()
      .json({
        optionDefinitions: [...colorDefinitions, { name: 'Size', values: ['Small', 'Large'] }],
      })
    added.assertRedirectsTo(`/seller/products/${item.id}/variants`)
    await duplicate.refresh()
    assert.isNull(duplicate.optionCombinationKey)
    assert.equal(duplicate.priceAmount, 101)
    assert.equal(duplicate.inventoryReservedQuantity, 1)
    const repaired = await client
      .patch(`/seller/products/${item.id}/variants/${duplicate.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .json({
        ...payload([
          { name: 'Color', value: 'Red' },
          { name: 'Size', value: 'Small' },
        ]),
        priceAmount: 101,
        inventoryQuantity: 7,
      })
    repaired.assertRedirectsTo(`/seller/products/${item.id}/variants`)
    const clean = await client
      .get(`/seller/products/${item.id}/variants`)
      .loginAs(owner)
      .withInertia()
    assert.lengthOf(clean.inertiaProps.product.optionIssues, 0)
    assert.lengthOf(await item.related('variants').query(), 2)
  })

  test('repairs legacy configurations with more than three dimensions without dropping records', async ({
    client,
    assert,
  }) => {
    const owner = await staff()
    const definitions = ['Color', 'Size', 'Material', 'Style'].map((name) => ({
      name,
      values: ['Default'],
    }))
    const item = await product(definitions)
    const first = await item.related('variants').create({
      ...defaults,
      title: 'Legacy',
      options: Object.fromEntries(definitions.map(({ name }) => [name, 'Default'])),
      position: 0,
    })
    const page = await client
      .get(`/seller/products/${item.id}/variants`)
      .loginAs(owner)
      .withInertia()
    assert.equal(page.inertiaProps.product.optionIssues[0].kind, 'configuration')
    assert.isNull(page.inertiaProps.product.optionIssues[0].variantId)
    const repaired = await client
      .patch(`/seller/products/${item.id}/variants/${first.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .json(payload(definitions.slice(0, 3).map(({ name }) => ({ name, value: 'Default' }))))
    repaired.assertRedirectsTo(`/seller/products/${item.id}/variants`)
    const updated = await client
      .patch(`/seller/products/${item.id}/options`)
      .loginAs(owner)
      .withCsrfToken()
      .json({ optionDefinitions: definitions.slice(0, 3) })
    updated.assertRedirectsTo(`/seller/products/${item.id}/variants`)
    assert.lengthOf(await item.related('variants').query(), 1)
    await first.refresh()
    assert.equal(first.inventoryQuantity, defaults.inventoryQuantity)
  })

  test('migration inference trims and deduplicates definitions while preserving historical tuples', async ({
    assert,
  }) => {
    const variants = [
      { options: JSON.stringify({ ' Color ': ' Blue ', 'Size': ' Small ' }) },
      { options: JSON.stringify({ 'color': 'blue', ' SIZE ': 'Large' }) },
      { options: JSON.stringify({ COLOR: 'Red', size: 'small' }) },
      { options: '{broken-json' },
      { options: JSON.stringify(['Blue']) },
    ]
    const historical = variants.map((variant) => ({ ...variant }))
    assert.deepEqual(inferLegacyOptionDefinitions(variants), [
      { name: 'Color', values: ['Blue', 'Red'] },
      { name: 'Size', values: ['Small', 'Large'] },
    ])
    assert.deepEqual(variants, historical)
  })

  test('expands repair choices without changing case and whitespace legacy tuples or business data', async ({
    client,
    assert,
  }) => {
    const owner = await staff()
    const item = await product([{ name: 'Color', values: ['Blue', 'Green'] }])
    await item
      .related('variants')
      .create({ ...defaults, title: 'Blue', options: { Color: 'Blue' }, position: 0 })
    const legacyOptions = [{ color: 'blue' }, { ' Color ': ' Blue ' }]
    for (const [index, options] of legacyOptions.entries()) {
      await db.table('product_variants').insert({
        product_id: item.id,
        title: `Legacy ${index}`,
        sku: `LEGACY-${index}`,
        options: JSON.stringify(options),
        option_combination_key: optionCombinationKey(options),
        price_amount: 101 + index,
        currency_code: 'PHP',
        inventory_quantity: 7 + index,
        inventory_reserved_quantity: 1,
        available_for_sale: true,
        position: index + 1,
        created_at: DateTime.utc().toSQL(),
      })
    }
    const historical = await db
      .from('product_variants')
      .where('product_id', item.id)
      .orderBy('position')
    const expanded = await client
      .patch(`/seller/products/${item.id}/options`)
      .loginAs(owner)
      .withCsrfToken()
      .json({
        optionDefinitions: [{ name: 'Color', values: ['Blue', 'Green', 'Red'] }],
      })
    expanded.assertRedirectsTo(`/seller/products/${item.id}/variants`)
    const preserved = await db
      .from('product_variants')
      .where('product_id', item.id)
      .orderBy('position')
    assert.deepEqual(preserved, historical)
    const page = await client
      .get(`/seller/products/${item.id}/variants`)
      .loginAs(owner)
      .withInertia()
    assert.lengthOf(
      page.inertiaProps.product.optionIssues.filter(
        (issue: { kind: string }) => issue.kind === 'invalid'
      ),
      2
    )
    const generation = await client
      .post(`/seller/products/${item.id}/variants/generate`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json(defaults)
    generation.assertStatus(422)
    const unsafeRemoval = await client
      .patch(`/seller/products/${item.id}/options`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json({
        optionDefinitions: [{ name: 'Color', values: ['Blue', 'Red'] }],
      })
    unsafeRemoval.assertStatus(422)
    const duplicateRepair = await client
      .patch(`/seller/products/${item.id}/variants/${historical[1].id}`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json(payload([{ name: 'Color', value: 'Blue' }]))
    duplicateRepair.assertStatus(422)
    for (const [index, value] of ['Red', 'Green'].entries()) {
      const repaired = await client
        .patch(`/seller/products/${item.id}/variants/${historical[index + 1].id}`)
        .loginAs(owner)
        .withCsrfToken()
        .json({
          ...payload([{ name: 'Color', value }]),
          sku: `LEGACY-${index}`,
          priceAmount: 101 + index,
          inventoryQuantity: 7 + index,
        })
      repaired.assertRedirectsTo(`/seller/products/${item.id}/variants`)
      const row = await ProductVariant.findOrFail(historical[index + 1].id)
      assert.equal(row.inventoryReservedQuantity, 1)
      assert.equal(row.priceAmount, 101 + index)
      assert.equal(row.sku, `LEGACY-${index}`)
    }
    const clean = await client
      .get(`/seller/products/${item.id}/variants`)
      .loginAs(owner)
      .withInertia()
    assert.lengthOf(clean.inertiaProps.product.optionIssues, 0)
  })

  test('lists malformed JSON safely and preserves it until explicit variant repair', async ({
    client,
    assert,
  }) => {
    const owner = await staff()
    const item = await product([{ name: 'Color', values: ['Blue'] }])
    item.merge({ status: 'active', publishedAt: DateTime.utc() })
    await item.save()
    await db.table('product_variants').insert({
      product_id: item.id,
      title: 'Malformed legacy',
      sku: 'MALFORMED-SKU',
      options: '{"Color":',
      option_combination_key: null,
      price_amount: 99,
      currency_code: 'PHP',
      inventory_quantity: 5,
      inventory_reserved_quantity: 1,
      available_for_sale: true,
      position: 0,
      created_at: DateTime.utc().toSQL(),
    })
    const historical = await db.from('product_variants').where('product_id', item.id).firstOrFail()
    const page = await client
      .get(`/seller/products/${item.id}/variants`)
      .loginAs(owner)
      .withInertia()
    page.assertStatus(200)
    assert.isNull(page.inertiaProps.product.variants[0].options)
    assert.isTrue(page.inertiaProps.product.variants[0].hasInvalidOptions)
    assert.equal(page.inertiaProps.product.optionIssues[0].kind, 'invalid')
    const publicPage = await client.get(`/product/${item.handle}`).withInertia()
    publicPage.assertStatus(200)
    assert.isFalse(publicPage.inertiaProps.product.variants[0].availableForSale)
    assert.deepEqual(publicPage.inertiaProps.product.variants[0].selectedOptions, [])
    const expanded = await client
      .patch(`/seller/products/${item.id}/options`)
      .loginAs(owner)
      .withCsrfToken()
      .json({
        optionDefinitions: [{ name: 'Color', values: ['Blue', 'Red'] }],
      })
    expanded.assertRedirectsTo(`/seller/products/${item.id}/variants`)
    const untouched = await db.from('product_variants').where('id', historical.id).firstOrFail()
    assert.deepEqual(untouched, historical)
    const removed = await client
      .patch(`/seller/products/${item.id}/options`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json({ optionDefinitions: [] })
    removed.assertStatus(422)
    const generation = await client
      .post(`/seller/products/${item.id}/variants/generate`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json(defaults)
    generation.assertStatus(422)
    const repaired = await client
      .patch(`/seller/products/${item.id}/variants/${historical.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .json({
        ...payload([{ name: 'Color', value: 'Blue' }]),
        sku: 'MALFORMED-SKU',
        priceAmount: 99,
        inventoryQuantity: 5,
      })
    repaired.assertRedirectsTo(`/seller/products/${item.id}/variants`)
    const row = await ProductVariant.findOrFail(historical.id)
    assert.deepEqual(row.options, { Color: 'Blue' })
    assert.isFalse(row.hasInvalidOptions)
    assert.isTrue(row.isSellable)
    assert.equal(row.inventoryReservedQuantity, 1)
    assert.equal(row.sku, 'MALFORMED-SKU')
  })

  test('assigns only product images and allows clearing the assignment', async ({
    client,
    assert,
  }) => {
    const owner = await staff()
    const item = await product()
    const first = await item
      .related('variants')
      .create({ ...defaults, title: 'Default', options: {}, position: 0 })
    const upload = await client
      .post(`/seller/products/${item.id}/images`)
      .loginAs(owner)
      .withCsrfToken()
      .file('images[0]', png, { filename: 'image.png', contentType: 'image/png' })
    upload.assertRedirectsTo(`/seller/products/${item.id}/variants`)
    const [image] = await item.media.all()
    const other = await Product.create({ title: 'Other', handle: 'other', status: 'draft' })
    other.media.addMany([
      await attachmentManager.createFromBuffer(png, {
        originalName: 'other.png',
        mimeType: 'image/png',
      }),
    ])
    await other.save()
    const [otherImage] = await other.media.all()
    item.media.addMany([
      await attachmentManager.createFromBuffer(Buffer.from('Document'), {
        originalName: 'document.txt',
        mimeType: 'text/plain',
      }),
    ])
    await item.save()
    const media = await item.media.all()
    const file = media.find((link) => link.attachment.mimeType === 'text/plain')!
    for (const featuredMediaId of [otherImage.id, file.id, 'missing-image']) {
      const invalid = await client
        .patch(`/seller/products/${item.id}/variants/${first.id}`)
        .loginAs(owner)
        .withCsrfToken()
        .accept('json')
        .json({ ...payload(), featuredMediaId })
      invalid.assertStatus(422)
      assert.equal(invalid.body().errors[0].field, 'featuredMediaId')
    }
    const assigned = await client
      .patch(`/seller/products/${item.id}/variants/${first.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .json({ ...payload(), featuredMediaId: image.id })
    assigned.assertRedirectsTo(`/seller/products/${item.id}/variants`)
    await first.refresh()
    assert.equal(first.featuredMediaId, image.id)
    const retained = await client
      .patch(`/seller/products/${item.id}/variants/${first.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .json({ ...payload(), featuredMediaId: undefined, title: 'Renamed variant' })
    retained.assertRedirectsTo(`/seller/products/${item.id}/variants`)
    await first.refresh()
    assert.equal(first.featuredMediaId, image.id)
    const cleared = await client
      .patch(`/seller/products/${item.id}/variants/${first.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .json(payload())
    cleared.assertRedirectsTo(`/seller/products/${item.id}/variants`)
    await first.refresh()
    assert.isNull(first.featuredMediaId)
  })
})

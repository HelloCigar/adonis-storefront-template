import type Product from '#models/catalog/product'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import { createProduct, createCollection } from '#tests/helpers/collections'

test.group('Collection queries', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('paginates published collection products and keeps all vendor options', async ({
    client,
    assert,
    route,
  }) => {
    const products: Product[] = []
    for (let index = 0; index < 13; index++) {
      products.push(
        await createProduct(`product-${index}`, index === 12 ? 'Last vendor' : 'First vendor', [10])
      )
    }
    const draft = await createProduct('draft', 'Draft vendor', [10], true, { status: 'draft' })
    const unpublished = await createProduct('unpublished', 'Hidden vendor', [10], true, {
      publishedAt: null,
    })
    await createProduct('outside', 'Outside vendor', [10])
    await createCollection([...products, draft, unpublished])

    const first = await client.get(route('collections.show', { handle: 'filtered' })).withInertia()
    first.assertStatus(200)
    const catalogue = first.inertiaProps.catalogue
    assert.deepEqual(
      catalogue.products.map((product: { id: string }) => product.id),
      products.slice(0, 12).map((product) => product.id)
    )
    assert.deepEqual(catalogue.vendors, ['First vendor', 'Last vendor'])
    assert.deepEqual(catalogue.pageInfo, {
      currentPage: 1,
      lastPage: 2,
      total: 13,
      perPage: 12,
      hasPreviousPage: false,
      hasNextPage: true,
    })

    const second = await client
      .get(route('collections.show', { handle: 'filtered' }, { qs: { page: '2' } }))
      .withInertia()
    assert.equal(second.inertiaProps.catalogue.products[0].id, products[12].id)
    assert.lengthOf(second.inertiaProps.catalogue.products, 1)
    assert.deepEqual(second.inertiaProps.catalogue.vendors, catalogue.vendors)
    assert.isTrue(second.inertiaProps.catalogue.pageInfo.hasPreviousPage)
    assert.isFalse(second.inertiaProps.catalogue.pageInfo.hasNextPage)

    const beyond = await client
      .get(route('collections.show', { handle: 'filtered' }, { qs: { page: '99' } }))
      .withInertia()
    assert.equal(beyond.inertiaProps.catalogue.query.page, 2)
    assert.equal(beyond.inertiaProps.catalogue.products[0].id, products[12].id)
  })

  test('combines availability, multiple vendors and the minimum variant price in SQL', async ({
    client,
    assert,
    route,
  }) => {
    const first = await createProduct('first', 'Alpha', [40, 90])
    const second = await createProduct('second', 'Beta', [60])
    const spanning = await createProduct('spanning', 'Alpha', [10, 80])
    const soldOut = await createProduct('sold-out', 'Beta', [50], false)
    const otherVendor = await createProduct('other-vendor', 'Gamma', [50])
    await createCollection([first, second, spanning, soldOut, otherVendor])
    await first.related('variants').query().where('position', 0).update({ availableForSale: false })

    const response = await client
      .get(route('collections.show', { handle: 'filtered' }))
      .qs({
        available: true,
        vendor: ['Alpha', 'Beta'],
        minPrice: 40,
        maxPrice: 60,
      })
      .withInertia()
    response.assertStatus(200)
    const catalogue = response.inertiaProps.catalogue
    assert.deepEqual(
      catalogue.products.map((product: { id: string }) => product.id),
      [first.id, second.id]
    )
    assert.equal(catalogue.pageInfo.total, 2)
    assert.isTrue(catalogue.query.available)
    assert.deepEqual(catalogue.query.vendor, ['Alpha', 'Beta'])
    assert.deepEqual(catalogue.vendors, ['Alpha', 'Beta', 'Gamma'])

    const unavailable = await client
      .get(route('collections.show', { handle: 'filtered' }, { qs: { available: 'false' } }))
      .withInertia()
    assert.deepEqual(
      unavailable.inertiaProps.catalogue.products.map((product: { id: string }) => product.id),
      [soldOut.id]
    )

    const empty = await client
      .get(
        route('collections.show', { handle: 'filtered' }, { qs: { minPrice: '100', page: '2' } })
      )
      .withInertia()
    assert.deepEqual(empty.inertiaProps.catalogue.products, [])
    assert.equal(empty.inertiaProps.catalogue.pageInfo.total, 0)
    assert.equal(empty.inertiaProps.catalogue.query.page, 1)
    assert.deepEqual(empty.inertiaProps.catalogue.vendors, ['Alpha', 'Beta', 'Gamma'])
  })

  test('rejects invalid query values and inverted price ranges', async ({ client, route }) => {
    await createCollection([])
    for (const query of [
      { page: 0 },
      { page: -1 },
      { page: 1.5 },
      { page: 'invalid' },
      { page: 1_000_001 },
      { available: 'invalid' },
      { vendor: 'Alpha' },
      { vendor: [''] },
      { vendor: ['Alpha', 'Alpha'] },
      { minPrice: -1 },
      { maxPrice: -1 },
      { minPrice: 'invalid' },
      { maxPrice: 'invalid' },
      { minPrice: 50, maxPrice: 49 },
      { vendor: Array.from({ length: 51 }, (_, index) => `vendor-${index}`) },
    ]) {
      const response = await client
        .get(route('collections.show', { handle: 'filtered' }))
        .qs(query)
        .accept('json')
      response.assertStatus(422)
    }
  })

  test('returns a consistent catalogue on partial filter visits', async ({
    client,
    assert,
    route,
  }) => {
    const product = await createProduct('filtered-product', 'Alpha', [25])
    await createCollection([product])
    const response = await client
      .get(
        route(
          'collections.show',
          { handle: 'filtered' },
          { qs: { available: 'true', minPrice: '25' } }
        )
      )
      .withInertiaPartialReload('collection/[handle]', ['catalogue'])
    response.assertStatus(200)
    assert.equal(response.inertiaProps.catalogue.products[0].id, product.id)
    assert.equal(response.inertiaProps.catalogue.query.minPrice, 25)
    assert.notProperty(response.inertiaProps, 'collection')
    assert.notProperty(response.inertiaProps, 'cart')
  })
})

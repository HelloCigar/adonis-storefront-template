import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User, { type UserRole } from '#models/account/user'
import Product from '#models/catalog/product'
import Collection from '#models/catalog/collection'
import Order from '#models/checkout/order'
import { DateTime } from 'luxon'

const account = (email: string, role: UserRole = 'seller') =>
  User.create({ email, role, fullName: email, password: 'secret-password' })
const productData = {
  title: 'Lamp',
  handle: 'lamp',
  status: 'draft' as const,
  description: null,
  vendor: null,
  productType: null,
}
const collectionData = {
  title: 'Lighting',
  handle: 'lighting',
  description: null,
  published: false,
  productIds: [] as number[],
}
const lineData = {
  title: 'Lamp',
  quantity: 1,
  unitPriceAmount: 250,
  totalAmount: 250,
  currencyCode: 'PHP',
}
const makeOrder = (number: string, userId: number) =>
  Order.create({
    number,
    userId,
    email: 'buyer@example.com',
    currencyCode: 'PHP',
    financialStatus: 'pending',
    fulfillmentStatus: 'unfulfilled',
    totalAmount: 250,
    processedAt: DateTime.utc(),
  })

test.group('Seller resource ownership', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('stamps product ownership and blocks another seller from products, variants, and images', async ({
    client,
    assert,
  }) => {
    const owner = await account('owner@example.com')
    const other = await account('other@example.com')
    const admin = await account('admin@example.com', 'admin')
    const created = await client
      .post('/seller/products')
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json({ ...productData, sellerId: other.id, seller_id: other.id })
    const product = await Product.findByOrFail('handle', productData.handle)
    created.assertRedirectsTo(`/seller/products/${product.id}/variants`)
    assert.equal(product.sellerId, owner.id)
    const foreign = await Product.create({ ...productData, handle: 'foreign', sellerId: other.id })
    const unassigned = await Product.create({ ...productData, handle: 'unassigned' })
    const variant = await foreign.related('variants').create({
      title: 'Default',
      priceAmount: 250,
      currencyCode: 'PHP',
      inventoryQuantity: 5,
      availableForSale: true,
      position: 0,
    })
    const list = await client.get('/seller/products').loginAs(owner).withInertia()
    assert.deepEqual(
      list.inertiaProps.products.map((item: { id: number }) => item.id),
      [product.id]
    )
    const foreignVariants = await client
      .get(`/seller/products/${foreign.id}/variants`)
      .loginAs(owner)
      .accept('json')
    foreignVariants.assertStatus(403)
    for (const [method, path] of [
      ['patch', `/seller/products/${foreign.id}`],
      ['delete', `/seller/products/${foreign.id}`],
      ['post', `/seller/products/${foreign.id}/variants`],
      ['patch', `/seller/products/${foreign.id}/variants/${variant.id}`],
      ['delete', `/seller/products/${foreign.id}/variants/${variant.id}`],
      ['post', `/seller/products/${foreign.id}/images`],
      ['delete', `/seller/products/${foreign.id}/images/image-id`],
      ['patch', `/seller/products/${unassigned.id}`],
      ['delete', `/seller/products/${unassigned.id}`],
    ] as const) {
      const denied = await client[method](path)
        .loginAs(owner)
        .withCsrfToken()
        .accept('json')
        .json(productData)
      denied.assertStatus(403)
    }
    await foreign.refresh()
    await variant.refresh()
    assert.equal(foreign.handle, 'foreign')
    assert.equal(variant.priceAmount, 250)
    assert.lengthOf(await foreign.media.all(), 0)
    const changed = await client
      .patch(`/seller/products/${product.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json({ ...productData, sellerId: other.id })
    changed.assertRedirectsTo('/seller/products')
    await product.refresh()
    assert.equal(product.sellerId, owner.id)
    const adminList = await client.get('/seller/products').loginAs(admin).withInertia()
    assert.lengthOf(adminList.inertiaProps.products, 3)
    const adminUpdate = await client
      .patch(`/seller/products/${foreign.id}`)
      .loginAs(admin)
      .withCsrfToken()
      .accept('json')
      .json({ ...productData, handle: 'foreign', title: 'Admin update' })
    adminUpdate.assertRedirectsTo('/seller/products')
    await foreign.refresh()
    assert.equal(foreign.title, 'Admin update')
    assert.equal(foreign.sellerId, other.id)
  })

  test('scopes collections and product choices and refuses foreign membership without partial writes', async ({
    client,
    assert,
  }) => {
    const owner = await account('owner@example.com')
    const other = await account('other@example.com')
    const admin = await account('admin@example.com', 'admin')
    const product = await Product.create({ ...productData, sellerId: owner.id })
    const foreignProduct = await Product.create({
      ...productData,
      handle: 'foreign',
      sellerId: other.id,
    })
    const foreignCollection = await Collection.create({
      title: 'Foreign',
      handle: 'foreign',
      sellerId: other.id,
    })
    const created = await client
      .post('/seller/collections')
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json({ ...collectionData, productIds: [product.id], sellerId: other.id })
    created.assertRedirectsTo('/seller/collections')
    const collection = await Collection.findByOrFail('handle', 'lighting')
    assert.equal(collection.sellerId, owner.id)
    const list = await client.get('/seller/collections').loginAs(owner).withInertia()
    assert.deepEqual(
      list.inertiaProps.collections.map((item: { id: number }) => item.id),
      [collection.id]
    )
    assert.deepEqual(
      list.inertiaProps.products.map((item: { id: number }) => item.id),
      [product.id]
    )
    for (const method of ['patch', 'delete'] as const) {
      const denied = await client[method](`/seller/collections/${foreignCollection.id}`)
        .loginAs(owner)
        .withCsrfToken()
        .accept('json')
        .json(collectionData)
      denied.assertStatus(403)
    }
    const invalidCreate = await client
      .post('/seller/collections')
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json({ ...collectionData, handle: 'blocked', productIds: [product.id, foreignProduct.id] })
    invalidCreate.assertStatus(403)
    assert.isNull(await Collection.findBy('handle', 'blocked'))
    const invalidUpdate = await client
      .patch(`/seller/collections/${collection.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json({ ...collectionData, title: 'Blocked title', productIds: [foreignProduct.id] })
    invalidUpdate.assertStatus(403)
    await collection.refresh()
    assert.equal(collection.title, 'Lighting')
    const members = await collection.related('products').query()
    assert.deepEqual(
      members.map((item) => item.id),
      [product.id]
    )
    const adminUpdate = await client
      .patch(`/seller/collections/${foreignCollection.id}`)
      .loginAs(admin)
      .withCsrfToken()
      .accept('json')
      .json({ ...collectionData, handle: 'foreign', productIds: [product.id, foreignProduct.id] })
    adminUpdate.assertRedirectsTo('/seller/collections')
    assert.lengthOf(await foreignCollection.related('products').query(), 2)
  })

  test('snapshots product sellers and limits order access to orders entirely owned by the seller', async ({
    client,
    assert,
  }) => {
    const owner = await account('owner@example.com')
    const other = await account('other@example.com')
    const buyer = await account('buyer@example.com', 'customer')
    const admin = await account('admin@example.com', 'admin')
    const product = await Product.create({ ...productData, sellerId: owner.id })
    const foreignProduct = await Product.create({
      ...productData,
      handle: 'foreign',
      sellerId: other.id,
    })
    const variant = await product
      .related('variants')
      .create({ title: 'Default', priceAmount: 250, currencyCode: 'PHP', position: 0 })
    const owned = await makeOrder('OWNED', buyer.id)
    const snapshot = await owned
      .related('lineItems')
      .create({ ...lineData, productVariantId: variant.id, sellerId: other.id })
    assert.equal(snapshot.productId, product.id)
    assert.equal(snapshot.sellerId, owner.id)
    const foreign = await makeOrder('FOREIGN', owner.id)
    await foreign
      .related('lineItems')
      .create({ ...lineData, productId: foreignProduct.id, sellerId: owner.id })
    const mixed = await makeOrder('MIXED', buyer.id)
    await mixed.related('lineItems').createMany([
      { ...lineData, productId: product.id },
      { ...lineData, productId: foreignProduct.id },
    ])
    const unassigned = await makeOrder('UNASSIGNED', buyer.id)
    await unassigned.related('lineItems').create(lineData)
    const partlyUnassigned = await makeOrder('PARTLY-UNASSIGNED', buyer.id)
    await partlyUnassigned
      .related('lineItems')
      .createMany([{ ...lineData, productId: product.id }, lineData])
    const empty = await makeOrder('EMPTY', buyer.id)
    const list = await client.get('/seller/orders').loginAs(owner).withInertia()
    assert.deepEqual(
      list.inertiaProps.orders.map((item: { id: number }) => item.id),
      [owned.id]
    )
    for (const order of [foreign, mixed, unassigned, partlyUnassigned, empty]) {
      const denied = await client.get(`/seller/orders/${order.id}`).loginAs(owner).accept('json')
      denied.assertStatus(403)
      const writeDenied = await client
        .patch(`/seller/orders/${order.id}`)
        .loginAs(owner)
        .withCsrfToken()
        .accept('json')
        .json({ financialStatus: 'paid', fulfillmentStatus: 'fulfilled', note: 'Blocked' })
      writeDenied.assertStatus(403)
      await order.refresh()
      assert.equal(order.financialStatus, 'pending')
      assert.isNull(order.note)
    }
    const otherList = await client.get('/seller/orders').loginAs(other).withInertia()
    assert.deepEqual(
      otherList.inertiaProps.orders.map((item: { id: number }) => item.id),
      [foreign.id]
    )
    const adminList = await client.get('/seller/orders').loginAs(admin).withInertia()
    assert.lengthOf(adminList.inertiaProps.orders, 6)
    const adminUpdate = await client
      .patch(`/seller/orders/${mixed.id}`)
      .loginAs(admin)
      .withCsrfToken()
      .accept('json')
      .json({ financialStatus: 'paid', fulfillmentStatus: 'fulfilled', note: 'Admin managed' })
    adminUpdate.assertRedirectsTo(`/seller/orders/${mixed.id}`)
    await assert.rejects(
      () =>
        owned
          .related('lineItems')
          .create({ ...lineData, productId: foreignProduct.id, productVariantId: variant.id }),
      'The order variant must belong to its product'
    )
    const deleted = await client
      .delete(`/seller/products/${product.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
    deleted.assertRedirectsTo('/seller/products')
    await snapshot.refresh()
    assert.isNull(snapshot.productId)
    assert.isNull(snapshot.productVariantId)
    assert.equal(snapshot.sellerId, owner.id)
    const history = await client.get(`/seller/orders/${owned.id}`).loginAs(owner).withInertia()
    history.assertStatus(200)
    const updated = await client
      .patch(`/seller/orders/${owned.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json({ financialStatus: 'paid', fulfillmentStatus: 'fulfilled', note: 'Still mine' })
    updated.assertRedirectsTo(`/seller/orders/${owned.id}`)
    await owned.refresh()
    assert.equal(owned.userId, buyer.id)
    assert.equal(owned.note, 'Still mine')
  })
})

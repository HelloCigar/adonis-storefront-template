import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import User, { type UserRole } from '#models/account/user'
import Product from '#models/catalog/product'
import Collection from '#models/catalog/collection'
import Order from '#models/checkout/order'
import { DateTime } from 'luxon'

const account = (email: string, role: UserRole = 'staff') =>
  User.create({ email, role, fullName: email, password: 'secret-password' })
const productData = {
  title: 'Lamp',
  handle: 'lamp',
  status: 'draft' as const,
  description: null,
  vendor: null,
  productType: null,
}

test.group('Shared store resource access', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('staff collaborate on all products while attribution and variant parent associations are preserved', async ({
    client,
    assert,
  }) => {
    const first = await account('first@example.com')
    const second = await account('second@example.com')
    const admin = await account('admin@example.com', 'admin')
    const created = await client
      .post('/seller/products')
      .loginAs(first)
      .withCsrfToken()
      .accept('json')
      .json({ ...productData, sellerId: second.id, seller_id: second.id })
    const product = await Product.findByOrFail('handle', 'lamp')
    created.assertRedirectsTo(`/seller/products/${product.id}`)
    assert.equal(product.sellerId, first.id)
    const another = await Product.create({ ...productData, handle: 'another', sellerId: second.id })
    const unassigned = await Product.create({ ...productData, handle: 'unassigned' })
    const variant = await another
      .related('variants')
      .create({ title: 'Default', priceAmount: 250, currencyCode: 'PHP', position: 0 })

    for (const actor of [first, second, admin]) {
      const list = await client.get('/seller/products').loginAs(actor).withInertia()
      assert.sameMembers(
        list.inertiaProps.products.map((item: { id: string }) => item.id),
        [product.id, another.id, unassigned.id]
      )
      const variants = await client
        .get(`/seller/products/${another.id}`)
        .loginAs(actor)
        .withInertia()
      variants.assertStatus(200)
      const mismatched = await client
        .patch(`/seller/products/${product.id}/variants/${variant.id}`)
        .loginAs(actor)
        .withCsrfToken()
        .accept('json')
        .json({})
      mismatched.assertStatus(404)
    }
    const updated = await client
      .patch(`/seller/products/${product.id}`)
      .loginAs(second)
      .withCsrfToken()
      .accept('json')
      .json({ ...productData, title: 'Shared edit', sellerId: second.id })
    updated.assertRedirectsTo(`/seller/products/${product.id}`)
    await product.refresh()
    assert.equal(product.title, 'Shared edit')
    assert.equal(product.sellerId, first.id)
    const removed = await client
      .delete(`/seller/products/${unassigned.id}`)
      .loginAs(second)
      .withCsrfToken()
    removed.assertRedirectsTo('/seller/products')
    assert.isNull(await Product.find(unassigned.id))
  })

  test('staff share collections and can attach products created by any staff member', async ({
    client,
    assert,
  }) => {
    const first = await account('first@example.com')
    const second = await account('second@example.com')
    const product = await Product.create({ ...productData, sellerId: first.id })
    const unassigned = await Product.create({ ...productData, handle: 'unassigned' })
    const payload = {
      title: 'Lighting',
      handle: 'lighting',
      description: null,
      published: false,
      productIds: [product.id, unassigned.id],
    }
    const created = await client
      .post('/seller/collections')
      .loginAs(second)
      .withCsrfToken()
      .accept('json')
      .json(payload)
    created.assertRedirectsTo('/seller/collections')
    const collection = await Collection.findByOrFail('handle', 'lighting')
    assert.equal(collection.sellerId, second.id)
    const list = await client.get('/seller/collections').loginAs(first).withInertia()
    assert.lengthOf(list.inertiaProps.collections, 1)
    assert.sameMembers(list.inertiaProps.collections[0].productIds, [product.id, unassigned.id])
    assert.lengthOf(list.inertiaProps.products, 2)
    const updated = await client
      .patch(`/seller/collections/${collection.id}`)
      .loginAs(first)
      .withCsrfToken()
      .accept('json')
      .json({ ...payload, title: 'Shared collection', productIds: [unassigned.id] })
    updated.assertRedirectsTo('/seller/collections')
    await collection.refresh()
    assert.equal(collection.title, 'Shared collection')
    assert.equal(collection.sellerId, second.id)
    const attached = await collection.related('products').query()
    assert.deepEqual(
      attached.map((item) => item.id),
      [unassigned.id]
    )
  })

  test('staff can manage all orders including mixed, unassigned, and empty orders', async ({
    client,
    assert,
  }) => {
    const first = await account('first@example.com')
    const second = await account('second@example.com')
    const buyer = await account('buyer@example.com', 'customer')
    const orders: Order[] = []
    for (const [index, creators] of [
      [],
      [null],
      [first.id, second.id],
      [first.id, null],
      [second.id],
    ].entries()) {
      const order = await Order.create({
        number: `SHARED-${index}`,
        userId: buyer.id,
        email: buyer.email,
        currencyCode: 'PHP',
        financialStatus: 'pending',
        fulfillmentStatus: 'unfulfilled',
        totalMinor: 25000,
        processedAt: DateTime.utc(),
      })
      for (const sellerId of creators)
        await order.related('lineItems').create({
          title: 'Lamp',
          quantity: 1,
          unitPriceMinor: 25000,
          totalMinor: 25000,
          currencyCode: 'PHP',
          sellerId,
        })
      orders.push(order)
    }
    for (const actor of [first, second]) {
      const list = await client.get('/seller/orders').loginAs(actor).withInertia()
      assert.sameMembers(
        list.inertiaProps.orders.map((item: { id: string }) => item.id),
        orders.map((order) => order.id)
      )
      for (const order of orders) {
        const detail = await client.get(`/seller/orders/${order.id}`).loginAs(actor).withInertia()
        detail.assertStatus(200)
        const updated = await client
          .patch(`/seller/orders/${order.id}`)
          .loginAs(actor)
          .withCsrfToken()
          .accept('json')
          .json({
            financialStatus: 'paid',
            fulfillmentStatus: 'fulfilled',
            note: 'Shared fulfilment',
          })
        updated.assertRedirectsTo(`/seller/orders/${order.id}`)
        await order.refresh()
        assert.equal(order.userId, buyer.id)
        assert.equal(order.totalAmount, 250)
      }
    }
  })
})

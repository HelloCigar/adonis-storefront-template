import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import app from '@adonisjs/core/services/app'
import hash from '@adonisjs/core/services/hash'
import User from '#models/account/user'
import Product from '#models/catalog/product'
import ProductVariant from '#models/catalog/product_variant'
import Collection from '#models/catalog/collection'
import Order from '#models/checkout/order'
import { AttachmentModel } from '@jrmc/adonis-attachment/lucid'
import { DateTime } from 'luxon'

const seller = () =>
  User.create({
    fullName: 'Store Owner',
    email: 'seller@example.com',
    password: 'secret-password',
    role: 'seller',
  })
const productPayload = {
  title: 'Bunny lamp',
  handle: 'bunny-lamp',
  description: 'A small lamp',
  vendor: null,
  productType: 'Lighting',
  status: 'active',
}
const variantPayload = {
  title: 'Blue',
  sku: 'LAMP-BLUE',
  priceAmount: 250,
  compareAtPriceAmount: null,
  currencyCode: 'PHP',
  inventoryQuantity: 5,
  availableForSale: true,
  options: [{ name: 'Color', value: 'Blue' }],
}

test.group('Seller management', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('protects every seller page and write from guests and customers', async ({
    client,
    assert,
  }) => {
    const customer = await User.create({
      email: 'customer@example.com',
      password: 'secret-password',
    })
    await customer.refresh()
    assert.equal(customer.role, 'customer')
    for (const path of [
      '/seller/products',
      '/seller/collections',
      '/seller/orders',
      '/seller/users',
      '/seller/products/1/variants',
      '/customers',
    ]) {
      const guest = await client.get(path).redirects(0)
      guest.assertStatus(302)
      guest.assertHeader('location', '/login')
      const denied = await client.get(path).loginAs(customer).accept('json')
      denied.assertStatus(403)
    }
    for (const [method, path] of [
      ['post', '/seller/products'],
      ['patch', '/seller/products/1'],
      ['delete', '/seller/products/1'],
      ['post', '/seller/collections'],
      ['patch', '/seller/collections/1'],
      ['delete', '/seller/collections/1'],
      ['post', '/seller/products/1/variants'],
      ['patch', '/seller/products/1/variants/1'],
      ['delete', '/seller/products/1/variants/1'],
      ['post', '/seller/products/1/images'],
      ['delete', '/seller/products/1/images/image-id'],
      ['patch', '/seller/orders/1'],
      ['post', '/seller/users'],
      ['patch', '/seller/users/1'],
      ['delete', '/seller/users/1'],
    ] as const) {
      const denied = await client[method](path)
        .loginAs(customer)
        .withCsrfToken()
        .accept('json')
        .json({})
      denied.assertStatus(403)
    }
    assert.isNull(await Product.first())
  })

  test('creates, publishes, updates, and deletes products and their variants', async ({
    client,
    assert,
  }) => {
    const owner = await seller()
    const created = await client
      .post('/seller/products')
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json(productPayload)
    const product = await Product.firstOrFail()
    created.assertRedirectsTo(`/seller/products/${product.id}/variants`)
    assert.isNull(product.publishedAt)
    const added = await client
      .post(`/seller/products/${product.id}/variants`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json(variantPayload)
    added.assertRedirectsTo(`/seller/products/${product.id}/variants`)
    await product.refresh()
    assert.isNotNull(product.publishedAt)
    const variant = await ProductVariant.firstOrFail()
    assert.deepEqual(variant.options, { Color: 'Blue' })
    const updated = await client
      .patch(`/seller/products/${product.id}/variants/${variant.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json({ ...variantPayload, priceAmount: 300, inventoryQuantity: 0, options: [] })
    updated.assertRedirectsTo(`/seller/products/${product.id}/variants`)
    await variant.refresh()
    assert.equal(variant.priceAmount, 300)
    assert.equal(variant.inventoryQuantity, 0)
    assert.isFalse(Boolean(variant.availableForSale))
    const list = await client.get('/seller/products').loginAs(owner).withInertia()
    list.assertInertiaComponent('seller/products')
    assert.equal(list.inertiaProps.products[0].variants[0].priceAmount, 300)
    const changed = await client
      .patch(`/seller/products/${product.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json({ ...productPayload, title: 'Updated lamp', description: null, status: 'draft' })
    changed.assertRedirectsTo('/seller/products')
    await product.refresh()
    assert.isNull(product.description)
    assert.isNull(product.publishedAt)
    const removed = await client
      .delete(`/seller/products/${product.id}/variants/${variant.id}`)
      .loginAs(owner)
      .withCsrfToken()
    removed.assertRedirectsTo(`/seller/products/${product.id}/variants`)
    assert.isNull(await ProductVariant.find(variant.id))
    const deleted = await client
      .delete(`/seller/products/${product.id}`)
      .loginAs(owner)
      .withCsrfToken()
    deleted.assertRedirectsTo('/seller/products')
    assert.isNull(await Product.find(product.id))
  })

  test('rejects invalid prices, duplicate handles, cross-product variants, and deleting the last active variant', async ({
    client,
    assert,
  }) => {
    const owner = await seller()
    const product = await Product.create({ ...productPayload, sellerId: owner.id })
    const variant = await product
      .related('variants')
      .create({ ...variantPayload, options: null, position: 0 })
    const duplicate = await client
      .post('/seller/products')
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json(productPayload)
    duplicate.assertStatus(422)
    const invalid = await client
      .post(`/seller/products/${product.id}/variants`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json({ ...variantPayload, sku: null, priceAmount: -1 })
    invalid.assertStatus(422)
    const badCompare = await client
      .post(`/seller/products/${product.id}/variants`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json({ ...variantPayload, sku: null, compareAtPriceAmount: 1 })
    badCompare.assertStatus(422)
    const wrongCurrency = await client
      .post(`/seller/products/${product.id}/variants`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json({ ...variantPayload, sku: null, currencyCode: 'USD' })
    wrongCurrency.assertStatus(422)
    const other = await Product.create({
      title: 'Other',
      handle: 'other',
      status: 'draft',
      sellerId: owner.id,
    })
    const hidden = await client
      .patch(`/seller/products/${other.id}/variants/${variant.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json(variantPayload)
    hidden.assertStatus(404)
    const last = await client
      .delete(`/seller/products/${product.id}/variants/${variant.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
    last.assertStatus(422)
    assert.isNotNull(await ProductVariant.find(variant.id))
    const variants = await product.related('variants').query()
    assert.lengthOf(variants, 1)
  })

  test('synchronizes collection membership and retains products on collection deletion', async ({
    client,
    assert,
  }) => {
    const owner = await seller()
    const product = await Product.create({ ...productPayload, sellerId: owner.id })
    const payload = {
      title: 'Lighting',
      handle: 'lighting',
      description: null,
      published: true,
      productIds: [product.id],
    }
    const created = await client
      .post('/seller/collections')
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json(payload)
    created.assertRedirectsTo('/seller/collections')
    const collection = await Collection.firstOrFail()
    assert.isNotNull(collection.publishedAt)
    const members = await collection.related('products').query()
    assert.equal(members[0].id, product.id)
    const invalid = await client
      .patch(`/seller/collections/${collection.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json({ ...payload, productIds: [999999] })
    invalid.assertStatus(422)
    const updated = await client
      .patch(`/seller/collections/${collection.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json({ ...payload, published: false, productIds: [] })
    updated.assertRedirectsTo('/seller/collections')
    await collection.refresh()
    assert.isNull(collection.publishedAt)
    assert.lengthOf(await collection.related('products').query(), 0)
    const deleted = await client
      .delete(`/seller/collections/${collection.id}`)
      .loginAs(owner)
      .withCsrfToken()
    deleted.assertRedirectsTo('/seller/collections')
    assert.isNotNull(await Product.find(product.id))
  })

  test('updates order statuses and notes while preserving financial and purchase history', async ({
    client,
    assert,
  }) => {
    const owner = await seller()
    const order = await Order.create({
      number: 'MB-1001',
      email: 'buyer@example.com',
      currencyCode: 'PHP',
      financialStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
      subtotalAmount: 250,
      totalAmount: 300,
      shippingAmount: 50,
      processedAt: DateTime.utc(),
    })
    const line = await order.related('lineItems').create({
      sellerId: owner.id,
      title: 'Lamp',
      quantity: 1,
      unitPriceAmount: 250,
      totalAmount: 250,
      currencyCode: 'PHP',
    })
    const updated = await client
      .patch(`/seller/orders/${order.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json({
        financialStatus: 'paid',
        fulfillmentStatus: 'fulfilled',
        note: 'Shipped today',
        totalAmount: 1,
      })
    updated.assertRedirectsTo(`/seller/orders/${order.id}`)
    await order.refresh()
    assert.equal(order.totalAmount, 300)
    assert.equal(order.financialStatus, 'paid')
    assert.equal(order.note, 'Shipped today')
    const page = await client.get(`/seller/orders/${order.id}`).loginAs(owner).withInertia()
    page.assertInertiaComponent('seller/order')
    assert.equal(page.inertiaProps.order.lineItems[0].id, line.id)
    const removed = await client.delete(`/seller/orders/${order.id}`).loginAs(owner).withCsrfToken()
    removed.assertStatus(404)
  })

  test('manages users without exposing passwords or removing the current admin', async ({
    client,
    assert,
  }) => {
    const owner = await seller()
    await owner.merge({ role: 'admin' }).save()
    const payload = {
      fullName: 'Buyer',
      email: 'buyer@example.com',
      role: 'customer',
      password: 'new-password',
    }
    const created = await client
      .post('/seller/users')
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json(payload)
    created.assertRedirectsTo('/seller/users')
    const buyer = await User.findByOrFail('email', payload.email)
    assert.isTrue(await hash.verify(buyer.password, payload.password))
    const historicalOrder = await Order.create({
      userId: buyer.id,
      number: 'MB-BUYER',
      email: buyer.email,
      currencyCode: 'PHP',
      financialStatus: 'paid',
      fulfillmentStatus: 'fulfilled',
      totalAmount: 250,
      processedAt: DateTime.utc(),
    })
    const list = await client.get('/seller/users').loginAs(owner).withInertia()
    list.assertInertiaComponent('seller/users')
    assert.notProperty(list.inertiaProps.users[0], 'password')
    const legacy = await client.get('/customers').loginAs(owner)
    legacy.assertRedirectsTo('/seller/users')
    const updated = await client
      .patch(`/seller/users/${buyer.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json({ fullName: 'New Seller', email: buyer.email, role: 'seller' })
    updated.assertRedirectsTo('/seller/users')
    await buyer.refresh()
    assert.equal(buyer.role, 'seller')
    const selfDemote = await client
      .patch(`/seller/users/${owner.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json({ fullName: owner.fullName, email: owner.email, role: 'customer' })
    selfDemote.assertStatus(422)
    const selfDelete = await client
      .delete(`/seller/users/${owner.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
    selfDelete.assertStatus(422)
    const deleted = await client.delete(`/seller/users/${buyer.id}`).loginAs(owner).withCsrfToken()
    deleted.assertRedirectsTo('/seller/users')
    assert.isNull(await User.find(buyer.id))
    await historicalOrder.refresh()
    assert.isNull(historicalOrder.userId)
    assert.equal(historicalOrder.totalAmount, 250)
  })

  test('uploads and removes owned product images and rejects images belonging to another product', async ({
    client,
    assert,
  }) => {
    const owner = await seller()
    const product = await Product.create({ ...productPayload, sellerId: owner.id })
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/vXcAAAAASUVORK5CYII=',
      'base64'
    )
    const uploaded = await client
      .post(`/seller/products/${product.id}/images`)
      .loginAs(owner)
      .withCsrfToken()
      .file('images[0]', png, { filename: 'lamp.png', contentType: 'image/png' })
    uploaded.assertRedirectsTo(`/seller/products/${product.id}/variants`)
    const invalidUpload = await client
      .post(`/seller/products/${product.id}/images`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .file('images[0]', Buffer.from('invalid'), { filename: 'bad.txt', contentType: 'text/plain' })
    invalidUpload.assertStatus(422)
    const images = await product.media.all()
    const image = images[0]
    assert.exists(image)
    const attachments = await app.container.make('jrmc.attachment')
    assert.deepEqual(Buffer.from(await attachments.read(image.toAttachment())), png)
    const other = await Product.create({
      title: 'Other',
      handle: 'other',
      status: 'draft',
      sellerId: owner.id,
    })
    const wrongOwner = await client
      .delete(`/seller/products/${other.id}/images/${image.id}`)
      .loginAs(owner)
      .withCsrfToken()
    wrongOwner.assertStatus(404)
    const removed = await client
      .delete(`/seller/products/${product.id}/images/${image.id}`)
      .loginAs(owner)
      .withCsrfToken()
    removed.assertRedirectsTo(`/seller/products/${product.id}/variants`)
    assert.lengthOf(await product.media.all(), 0)
    assert.isNull(await AttachmentModel.find(image.attachmentId))
  })

  test('admin access reaches seller resources and can assign the admin role', async ({
    client,
    assert,
  }) => {
    const admin = await User.create({
      fullName: 'Administrator',
      email: 'admin@example.com',
      password: 'secret-password',
      role: 'admin',
    })
    const product = await Product.create(productPayload)
    const order = await Order.create({
      number: 'MB-ADMIN',
      currencyCode: 'PHP',
      email: 'buyer@example.com',
      financialStatus: 'paid',
      fulfillmentStatus: 'unfulfilled',
      totalAmount: 250,
      processedAt: DateTime.utc(),
    })
    for (const path of [
      '/seller/products',
      '/seller/collections',
      '/seller/orders',
      '/seller/users',
      `/seller/products/${product.id}/variants`,
      `/seller/orders/${order.id}`,
    ]) {
      const page = await client.get(path).loginAs(admin).withInertia()
      page.assertStatus(200)
      assert.isTrue(page.inertiaProps.permissions.manageSeller)
    }
    const legacy = await client.get('/customers').loginAs(admin)
    legacy.assertRedirectsTo('/seller/users')
    const created = await client
      .post('/seller/users')
      .loginAs(admin)
      .withCsrfToken()
      .accept('json')
      .json({
        fullName: 'Second Admin',
        email: 'second-admin@example.com',
        password: 'secret-password',
        role: 'admin',
      })
    created.assertRedirectsTo('/seller/users')
    const secondAdmin = await User.findByOrFail('email', 'second-admin@example.com')
    assert.equal(secondAdmin.role, 'admin')
    const list = await client.get('/seller/users').loginAs(admin).withInertia()
    assert.isTrue(list.inertiaProps.canAssignAdmin)
    const target = list.inertiaProps.users.find(
      (user: { id: number }) => user.id === secondAdmin.id
    )
    assert.deepEqual(target.can, { edit: true, delete: true })
    const selfUpdate = await client
      .patch(`/seller/users/${admin.id}`)
      .loginAs(admin)
      .withCsrfToken()
      .accept('json')
      .json({ fullName: 'Updated Admin', email: admin.email, role: 'admin' })
    selfUpdate.assertRedirectsTo('/seller/users')
    await admin.refresh()
    assert.equal(admin.fullName, 'Updated Admin')
    const selfDemote = await client
      .patch(`/seller/users/${admin.id}`)
      .loginAs(admin)
      .withCsrfToken()
      .accept('json')
      .json({ fullName: admin.fullName, email: admin.email, role: 'seller' })
    selfDemote.assertStatus(422)
    const selfDelete = await client
      .delete(`/seller/users/${admin.id}`)
      .loginAs(admin)
      .withCsrfToken()
      .accept('json')
    selfDelete.assertStatus(422)
    const edited = await client
      .patch(`/seller/users/${secondAdmin.id}`)
      .loginAs(admin)
      .withCsrfToken()
      .accept('json')
      .json({ fullName: 'Updated Second Admin', email: secondAdmin.email, role: 'admin' })
    edited.assertRedirectsTo('/seller/users')
    await secondAdmin.refresh()
    assert.equal(secondAdmin.fullName, 'Updated Second Admin')
    const deleted = await client
      .delete(`/seller/users/${secondAdmin.id}`)
      .loginAs(admin)
      .withCsrfToken()
    deleted.assertRedirectsTo('/seller/users')
    assert.isNull(await User.find(secondAdmin.id))
  })

  test('global user management is admin-only and roles are validated', async ({
    client,
    assert,
  }) => {
    const owner = await seller()
    const admin = await User.create({
      fullName: 'Administrator',
      email: 'admin@example.com',
      password: 'secret-password',
      role: 'admin',
    })
    const customer = await User.create({
      fullName: 'Customer',
      email: 'customer@example.com',
      password: 'secret-password',
    })
    const created = await client
      .post('/seller/users')
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json({
        fullName: 'Injected Admin',
        email: 'injected-admin@example.com',
        password: 'secret-password',
        role: 'admin',
      })
    created.assertStatus(403)
    assert.isNull(await User.findBy('email', 'injected-admin@example.com'))
    const promoted = await client
      .patch(`/seller/users/${customer.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json({ fullName: customer.fullName, email: customer.email, role: 'admin' })
    promoted.assertStatus(403)
    await customer.refresh()
    assert.equal(customer.role, 'customer')
    const edited = await client
      .patch(`/seller/users/${admin.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
      .json({ fullName: 'Changed', email: admin.email, role: 'customer' })
    edited.assertStatus(403)
    const deleted = await client
      .delete(`/seller/users/${admin.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
    deleted.assertStatus(403)
    await admin.refresh()
    assert.equal(admin.role, 'admin')
    assert.equal(admin.fullName, 'Administrator')
    for (const path of ['/seller/users', '/customers']) {
      const denied = await client.get(path).loginAs(owner).accept('json')
      denied.assertStatus(403)
    }
    const dashboard = await client.get('/dashboard').loginAs(owner).withInertia()
    assert.isTrue(dashboard.inertiaProps.permissions.manageSeller)
    assert.isFalse(dashboard.inertiaProps.permissions.manageUsers)
    for (const role of ['customer', 'seller', 'admin']) {
      const denied = await client
        .post('/seller/users')
        .loginAs(owner)
        .withCsrfToken()
        .accept('json')
        .json({
          fullName: 'Blocked',
          email: `blocked-${role}@example.com`,
          password: 'secret-password',
          role,
        })
      denied.assertStatus(403)
    }
    const deletedCustomer = await client
      .delete(`/seller/users/${customer.id}`)
      .loginAs(owner)
      .withCsrfToken()
      .accept('json')
    deletedCustomer.assertStatus(403)
    for (const actor of [admin]) {
      const invalid = await client
        .patch(`/seller/users/${customer.id}`)
        .loginAs(actor)
        .withCsrfToken()
        .accept('json')
        .json({ fullName: customer.fullName, email: customer.email, role: 'owner' })
      invalid.assertStatus(422)
    }
  })
})

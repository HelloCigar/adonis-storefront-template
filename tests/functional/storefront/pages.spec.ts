import Collection from '#models/catalog/collection'
import Cart from '#models/checkout/cart'
import Order from '#models/checkout/order'
import Product from '#models/catalog/product'
import ProductVariant from '#models/catalog/product_variant'
import User from '#models/account/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import storefront from '#config/storefront'
import { urlFor } from '@adonisjs/core/services/url_builder'

test.group('Storefront', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('renders authored content through the focused resource controllers', async ({
    client,
    assert,
    cleanup,
    route,
  }) => {
    storefront.pages.push({
      id: 'about',
      handle: 'about',
      title: 'About us',
      body: '<p>Our store.</p>',
    })
    storefront.policies.push({
      id: 'returns',
      handle: 'returns',
      title: 'Returns',
      body: '<p>Returns policy.</p>',
    })
    cleanup(() => {
      storefront.pages.splice(0)
      storefront.policies.splice(0)
    })

    const page = await client.get(route('pages.show', { handle: 'about' })).withInertia()
    page.assertStatus(200)
    page.assertInertiaComponent('pages/[handle]')
    assert.equal(page.inertiaProps.page.title, 'About us')
    const policies = await client.get(route('policies.index')).withInertia()
    policies.assertStatus(200)
    policies.assertInertiaComponent('policies/index')
    assert.equal(policies.inertiaProps.policies[0].handle, 'returns')
    const policy = await client.get(route('policies.show', { handle: 'returns' })).withInertia()
    policy.assertStatus(200)
    policy.assertInertiaComponent('policies/[handle]')
    assert.equal(policy.inertiaProps.policy.body, '<p>Returns policy.</p>')
    for (const url of [
      route('pages.show', { handle: 'missing' }),
      route('policies.show', { handle: 'missing' }),
    ]) {
      const missing = await client.get(url).withInertia()
      missing.assertStatus(404)
    }
  })

  test('updates account profiles and manages only the signed-in customer addresses', async ({
    client,
    assert,
    route,
  }) => {
    const user = await User.create({ email: 'addresses@example.com', password: 'secret-password' })
    const otherUser = await User.create({
      email: 'other-addresses@example.com',
      password: 'secret-password',
    })
    const profile = await client
      .patch(urlFor('account.profile.update'))
      .loginAs(user)
      .withCsrfToken()
      .json({ firstName: 'Mina', lastName: 'Bunny' })
    profile.assertRedirectsTo(route('account.show'))
    await user.refresh()
    assert.equal(user.fullName, 'Mina Bunny')

    const payload = { address1: 'First Street', city: 'Manila', zip: '1000', territoryCode: 'ph' }
    const created = await client
      .post(urlFor('account.addresses.create'))
      .loginAs(user)
      .withCsrfToken()
      .json(payload)
    created.assertRedirectsTo(route('account.show'))
    const first = await user.related('addresses').query().firstOrFail()
    await user.refresh()
    assert.equal(user.defaultAddressId, first.id)
    assert.equal(first.countryCode, 'PH')
    assert.equal(first.postalCode, '1000')

    const updated = await client
      .patch(urlFor('account.addresses.update', { id: first.id }))
      .loginAs(user)
      .withCsrfToken()
      .json({ ...payload, address1: 'Updated Street' })
    updated.assertRedirectsTo(route('account.show'))
    await first.refresh()
    assert.equal(first.address1, 'Updated Street')

    const secondCreated = await client
      .post(urlFor('account.addresses.create'))
      .loginAs(user)
      .withCsrfToken()
      .json({ ...payload, address1: 'Second Street', defaultAddress: true })
    secondCreated.assertRedirectsTo(route('account.show'))
    const second = await user.related('addresses').query().whereNot('id', first.id).firstOrFail()
    await user.refresh()
    assert.equal(user.defaultAddressId, second.id)
    const defaulted = await client
      .post(urlFor('account.addresses.default', { id: first.id }))
      .loginAs(user)
      .withCsrfToken()
    defaulted.assertRedirectsTo(route('account.show'))
    await user.refresh()
    assert.equal(user.defaultAddressId, first.id)

    for (const [method, name] of [
      ['patch', 'account.addresses.update'],
      ['post', 'account.addresses.default'],
      ['delete', 'account.addresses.delete'],
    ] as const) {
      const denied = await client[method](urlFor(name, { id: first.id }))
        .loginAs(otherUser)
        .withCsrfToken()
        .json(payload)
      denied.assertStatus(404)
    }
    await first.refresh()
    assert.equal(first.address1, 'Updated Street')

    const deleted = await client
      .delete(urlFor('account.addresses.delete', { id: first.id }))
      .loginAs(user)
      .withCsrfToken()
    deleted.assertRedirectsTo(route('account.show'))
    await user.refresh()
    assert.isNull(user.defaultAddressId)
    assert.isNull(await user.related('addresses').query().where('id', first.id).first())
    assert.isNotNull(await user.related('addresses').query().where('id', second.id).first())
  })

  test('renders published catalogue data through Inertia', async ({ client, assert, route }) => {
    const product = await Product.create({
      title: 'Bunny Lamp',
      handle: 'bunny-lamp',
      description: 'A small light with a lot of character.',
      status: 'active',
      publishedAt: DateTime.utc(),
    })
    await ProductVariant.create({
      productId: product.id,
      title: 'Default',
      priceAmount: 49,
      currencyCode: 'USD',
      availableForSale: true,
      position: 0,
    })
    const collection = await Collection.create({
      title: 'Desk Friends',
      handle: 'desk-friends',
      description: 'Small companions for the workday.',
      publishedAt: DateTime.utc(),
    })
    await collection.related('products').attach({ [product.id]: { position: 0 } })

    const home = await client.get(route('home')).withInertia()
    home.assertStatus(200)
    home.assertInertiaComponent('index')
    assert.equal(home.inertiaProps.newestProducts[0].title, 'Bunny Lamp')
    assert.equal(home.inertiaProps.newestProducts[0].priceRange.minVariantPrice.amount, 49)
    assert.equal(home.inertiaProps.collections[0].title, 'Desk Friends')
    assert.isNull(home.inertiaProps.cart)
    assert.notProperty(home.inertiaProps, 'searchResults')
    assert.isNull(await Cart.first())

    await Product.create({ title: 'Bunny draft', handle: 'draft', status: 'draft' })
    const search = await client
      .get(route('home', [], { qs: { search: 'Bunny' } }))
      .withInertiaPartialReload('index', ['searchResults'])
    search.assertStatus(200)
    assert.equal(search.inertiaProps.searchResults.products.length, 1)
    assert.equal(search.inertiaProps.searchResults.products[0].handle, 'bunny-lamp')
    assert.notProperty(search.inertiaProps, 'newestProducts')
    assert.notProperty(search.inertiaProps, 'collections')
    assert.notProperty(search.inertiaProps, 'cart')

    const clearedSearch = await client
      .get(route('home', [], { qs: { search: '' } }))
      .withInertiaPartialReload('index', ['searchResults'])
    assert.deepEqual(clearedSearch.inertiaProps.searchResults, { products: [], collections: [] })

    const collectionPage = await client
      .get(route('collections.show', { handle: 'desk-friends' }))
      .withInertia()
    collectionPage.assertStatus(200)
    collectionPage.assertInertiaComponent('collection/[handle]')
    assert.equal(collectionPage.inertiaProps.collection.handle, 'desk-friends')
    assert.equal(collectionPage.inertiaProps.catalogue.products[0].handle, 'bunny-lamp')

    const productPage = await client
      .get(route('products.show', { handle: 'bunny-lamp' }))
      .withInertia()
    productPage.assertStatus(200)
    productPage.assertInertiaComponent('product/[handle]')
    assert.equal(productPage.inertiaProps.product.selectedOrFirstAvailableVariant.title, 'Default')
  })

  test('cart form visits redirect and reload only the session-owned cart prop', async ({
    client,
    assert,
    route,
  }) => {
    const product = await Product.create({
      title: 'Lamp',
      handle: 'lamp',
      status: 'active',
      publishedAt: DateTime.utc(),
    })
    const variant = await ProductVariant.create({
      productId: product.id,
      title: 'Default',
      priceAmount: 49,
      currencyCode: 'PHP',
      availableForSale: true,
      inventoryQuantity: 3,
      position: 0,
    })
    const cart = await Cart.create({ token: 'test-cart', status: 'active', currencyCode: 'PHP' })
    const session = { store_cart_token: cart.token }
    const added = await client
      .post(urlFor('cart.add'))
      .withSession(session)
      .withCsrfToken()
      .withInertia()
      .header('referer', route('products.show', { handle: 'lamp' }))
      .json({ variantId: variant.id, quantity: 1 })
    added.assertRedirectsTo(route('products.show', { handle: 'lamp' }))
    const readCart = () =>
      client
        .get(route('products.show', { handle: 'lamp' }))
        .withSession(session)
        .withInertiaPartialReload('product/[handle]', ['cart'])
    const page = await readCart()
    assert.equal(page.inertiaProps.cart.totalQuantity, 1)
    assert.equal(page.inertiaProps.cart.lines[0].merchandise.product.handle, 'lamp')
    assert.notProperty(page.inertiaProps, 'product')
    assert.notProperty(page.inertiaProps, 'recommendations')
    const id = page.inertiaProps.cart.lines[0].id
    const updated = await client
      .patch(urlFor('cart.update', { id }))
      .withSession(session)
      .withCsrfToken()
      .withInertia()
      .header('referer', route('products.show', { handle: 'lamp' }))
      .json({ quantity: 2 })
    updated.assertRedirectsTo(route('products.show', { handle: 'lamp' }))
    const updatedPage = await readCart()
    assert.equal(updatedPage.inertiaProps.cart.cost.totalAmount.amount, 98)

    const rejected = await client
      .patch(urlFor('cart.update', { id }))
      .withSession(session)
      .withCsrfToken()
      .withInertia()
      .accept('html')
      .header('referer', route('products.show', { handle: 'lamp' }))
      .json({ quantity: 4 })
    rejected.assertRedirectsTo(route('products.show', { handle: 'lamp' }))
    const rejectedPage = await readCart()
    assert.equal(rejectedPage.inertiaProps.cart.totalQuantity, 2)

    const otherCart = await client
      .get(route('products.show', { handle: 'lamp' }))
      .withSession({ store_cart_token: 'someone-else' })
      .withInertiaPartialReload('product/[handle]', ['cart'])
    assert.isNull(otherCart.inertiaProps.cart)
    const removed = await client
      .delete(urlFor('cart.remove', { id }))
      .withSession(session)
      .withCsrfToken()
      .withInertia()
      .header('referer', route('products.show', { handle: 'lamp' }))
    removed.assertRedirectsTo(route('products.show', { handle: 'lamp' }))
    const emptyPage = await readCart()
    assert.deepEqual(emptyPage.inertiaProps.cart.lines, [])
    const oldSearch = await client.get('/store/search')
    oldSearch.assertStatus(404)
    const oldCart = await client.get(urlFor('cart.add'))
    oldCart.assertStatus(404)
  })

  test('protects account pages and exposes only the signed-in customer orders', async ({
    client,
    assert,
    route,
  }) => {
    const guestResponse = await client.get(route('account.show'))
    guestResponse.assertRedirectsTo(route('session.create'))

    const customer = await User.create({
      fullName: 'Mina Bunny',
      firstName: 'Mina',
      lastName: 'Bunny',
      email: 'mina@example.com',
      password: 'secret-password',
    })
    const otherCustomer = await User.create({
      fullName: 'Other Customer',
      email: 'other@example.com',
      password: 'secret-password',
    })
    const order = await Order.create({
      userId: customer.id,
      number: 'MB-1001',
      email: customer.email,
      currencyCode: 'USD',
      financialStatus: 'paid',
      fulfillmentStatus: 'unfulfilled',
      subtotalMinor: 4900,
      discountMinor: 0,
      shippingMinor: 500,
      taxMinor: 0,
      totalMinor: 5400,
      processedAt: DateTime.utc(),
    })
    await order.related('lineItems').create({
      title: 'Bunny Lamp',
      variantTitle: 'Default',
      quantity: 1,
      unitPriceMinor: 4900,
      discountMinor: 0,
      totalMinor: 4900,
      currencyCode: 'USD',
    })

    const account = await client.get(route('account.show')).loginAs(customer).withInertia()
    account.assertStatus(200)
    account.assertInertiaComponent('account/index')
    assert.equal(account.inertiaProps.customer.emailAddress.emailAddress, customer.email)
    assert.equal(account.inertiaProps.recentOrders[0].name, 'MB-1001')

    const orderPage = await client
      .get(route('orders.show', { id: order.id }))
      .loginAs(customer)
      .withInertia()
    orderPage.assertStatus(200)
    orderPage.assertInertiaComponent('account/orders/[id]')
    assert.equal(orderPage.inertiaProps.order.lineItems[0].title, 'Bunny Lamp')

    const hiddenOrder = await client
      .get(route('orders.show', { id: order.id }))
      .loginAs(otherCustomer)
      .withInertia()
    hiddenOrder.assertStatus(404)
  })
})

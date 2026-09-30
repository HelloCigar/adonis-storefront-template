import Collection from '#models/collection'
import Cart from '#models/cart'
import Order from '#models/order'
import Product from '#models/product'
import ProductVariant from '#models/product_variant'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

test.group('Storefront', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('renders published catalogue data through Inertia', async ({ client, assert }) => {
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

    const home = await client.get('/').withInertia()
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
      .get('/?search=Bunny')
      .withInertiaPartialReload('index', ['searchResults'])
    search.assertStatus(200)
    assert.equal(search.inertiaProps.searchResults.products.length, 1)
    assert.equal(search.inertiaProps.searchResults.products[0].handle, 'bunny-lamp')
    assert.notProperty(search.inertiaProps, 'newestProducts')
    assert.notProperty(search.inertiaProps, 'collections')
    assert.notProperty(search.inertiaProps, 'cart')

    const clearedSearch = await client
      .get('/?search=')
      .withInertiaPartialReload('index', ['searchResults'])
    assert.deepEqual(clearedSearch.inertiaProps.searchResults, { products: [], collections: [] })

    const collectionPage = await client.get('/collection/desk-friends').withInertia()
    collectionPage.assertStatus(200)
    collectionPage.assertInertiaComponent('collection/[handle]')
    assert.equal(collectionPage.inertiaProps.collection.handle, 'desk-friends')
    assert.equal(collectionPage.inertiaProps.products[0].handle, 'bunny-lamp')

    const productPage = await client.get('/product/bunny-lamp').withInertia()
    productPage.assertStatus(200)
    productPage.assertInertiaComponent('product/[handle]')
    assert.equal(productPage.inertiaProps.product.selectedOrFirstAvailableVariant.title, 'Default')
  })

  test('cart form visits redirect and reload only the session-owned cart prop', async ({
    client,
    assert,
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
      .post('/store/cart')
      .withSession(session)
      .withCsrfToken()
      .withInertia()
      .header('referer', '/product/lamp')
      .json({ variantId: variant.id, quantity: 1 })
    added.assertRedirectsTo('/product/lamp')
    const readCart = () =>
      client
        .get('/product/lamp')
        .withSession(session)
        .withInertiaPartialReload('product/[handle]', ['cart'])
    const page = await readCart()
    assert.equal(page.inertiaProps.cart.totalQuantity, 1)
    assert.equal(page.inertiaProps.cart.lines[0].merchandise.product.handle, 'lamp')
    assert.notProperty(page.inertiaProps, 'product')
    assert.notProperty(page.inertiaProps, 'recommendations')
    const id = page.inertiaProps.cart.lines[0].id
    const updated = await client
      .patch('/store/cart/' + id)
      .withSession(session)
      .withCsrfToken()
      .withInertia()
      .header('referer', '/product/lamp')
      .json({ quantity: 2 })
    updated.assertRedirectsTo('/product/lamp')
    const updatedPage = await readCart()
    assert.equal(updatedPage.inertiaProps.cart.cost.totalAmount.amount, 98)

    const rejected = await client
      .patch('/store/cart/' + id)
      .withSession(session)
      .withCsrfToken()
      .withInertia()
      .accept('html')
      .header('referer', '/product/lamp')
      .json({ quantity: 4 })
    rejected.assertRedirectsTo('/product/lamp')
    const rejectedPage = await readCart()
    assert.equal(rejectedPage.inertiaProps.cart.totalQuantity, 2)

    const otherCart = await client
      .get('/product/lamp')
      .withSession({ store_cart_token: 'someone-else' })
      .withInertiaPartialReload('product/[handle]', ['cart'])
    assert.isNull(otherCart.inertiaProps.cart)
    const removed = await client
      .delete('/store/cart/' + id)
      .withSession(session)
      .withCsrfToken()
      .withInertia()
      .header('referer', '/product/lamp')
    removed.assertRedirectsTo('/product/lamp')
    const emptyPage = await readCart()
    assert.deepEqual(emptyPage.inertiaProps.cart.lines, [])
    const oldSearch = await client.get('/store/search')
    oldSearch.assertStatus(404)
    const oldCart = await client.get('/store/cart')
    oldCart.assertStatus(404)
  })

  test('protects account pages and exposes only the signed-in customer orders', async ({
    client,
    assert,
  }) => {
    const guestResponse = await client.get('/account')
    guestResponse.assertRedirectsTo('/login')

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
      subtotalAmount: 49,
      discountAmount: 0,
      shippingAmount: 5,
      taxAmount: 0,
      totalAmount: 54,
      processedAt: DateTime.utc(),
    })
    await order.related('lineItems').create({
      title: 'Bunny Lamp',
      variantTitle: 'Default',
      quantity: 1,
      unitPriceAmount: 49,
      discountAmount: 0,
      totalAmount: 49,
      currencyCode: 'USD',
    })

    const account = await client.get('/account').loginAs(customer).withInertia()
    account.assertStatus(200)
    account.assertInertiaComponent('account/index')
    assert.equal(account.inertiaProps.customer.emailAddress.emailAddress, customer.email)
    assert.equal(account.inertiaProps.recentOrders[0].name, 'MB-1001')

    const orderPage = await client
      .get(`/account/orders/${order.id}`)
      .loginAs(customer)
      .withInertia()
    orderPage.assertStatus(200)
    orderPage.assertInertiaComponent('account/orders/[id]')
    assert.equal(orderPage.inertiaProps.order.lineItems[0].title, 'Bunny Lamp')

    const hiddenOrder = await client
      .get(`/account/orders/${order.id}`)
      .loginAs(otherCustomer)
      .withInertia()
    hiddenOrder.assertStatus(404)
  })
})

import { test } from '@japa/runner'
import checkoutConfig from '#config/checkout'
import Cart from '#models/checkout/cart'
import Order from '#models/checkout/order'
import { runQueue } from '#tests/helpers/queue'
import {
  cartReady,
  orderTotalMinor,
  resetCheckoutState,
  submitCheckout,
  useFakeProvider,
} from '#tests/helpers/payments'

test.group('Checkout submission', (group) => {
  group.each.setup(() => resetCheckoutState())

  test('submitting checkout freezes one order with exact totals and holds its stock', async ({
    client,
    assert,
  }) => {
    const provider = useFakeProvider()
    const { variant, token, input } = await cartReady()

    const response = await submitCheckout(client, token, input)

    const order = await Order.firstOrFail()
    response.assertHeader('location', `/checkout/orders/${order.publicId}`)
    assert.equal(order.totalMinor, orderTotalMinor)
    assert.equal(order.shippingMinor, 10_000)
    await variant.refresh()
    assert.equal(variant.inventoryReservedQuantity, 2)
    assert.isEmpty(provider.calls)
  })

  test('submitting the same checkout again returns the same order', async ({ client, db }) => {
    useFakeProvider()
    const { token, input } = await cartReady()

    const first = await submitCheckout(client, token, input)
    const again = await submitCheckout(client, token, input)

    again.assertHeader('location', first.header('location'))
    await db.assertCount('orders', 1)
  })

  test('a resubmission with changed details is rejected', async ({ client, assert }) => {
    useFakeProvider()
    const { token, input } = await cartReady()
    const placed = await submitCheckout(client, token, input)

    const changed = await submitCheckout(client, token, { ...input, email: 'changed@example.com' })

    changed.assertStatus(302)
    assert.notEqual(changed.header('location'), placed.header('location'))
    const orders = await Order.all()
    assert.lengthOf(orders, 1)
    assert.equal(orders[0].email, 'guest@example.com')
  })

  test('the provider checkout returns the customer to their order page', async ({
    client,
    assert,
  }) => {
    const provider = useFakeProvider()
    const { token, input } = await cartReady()
    await submitCheckout(client, token, input)

    await runQueue(['payments'])

    const order = await Order.firstOrFail()
    const orderUrl = `${new URL(checkoutConfig.publicUrl!).origin}/checkout/orders/${order.publicId}`
    const [request] = provider.checkoutRequests.values()
    assert.equal(request.successUrl, orderUrl)
    assert.equal(request.cancelUrl, orderUrl)
  })

  test('a stale quote leaves no order or stock hold and keeps the cart', async ({
    client,
    assert,
    db,
  }) => {
    useFakeProvider()
    const { variant, token, input } = await cartReady()
    variant.priceAmount = 500
    await variant.save()

    await submitCheckout(client, token, input)

    await db.assertEmpty('orders')
    await db.assertEmpty('stock_reservations')
    const cart = await Cart.findByOrFail('token', token)
    assert.equal(cart.status, 'active')
  })

  test('competing submissions of one cart produce one order and never over-reserve stock', async ({
    client,
    assert,
    db,
  }) => {
    useFakeProvider()
    const { variant, token, input } = await cartReady()

    await Promise.all([submitCheckout(client, token, input), submitCheckout(client, token, input)])

    await db.assertCount('orders', 1)
    await variant.refresh()
    assert.equal(variant.inventoryReservedQuantity, 2)
  })

  test('an existing cart without a submission key gets one stable key and keeps its lines', async ({
    client,
    assert,
  }) => {
    useFakeProvider()
    const { token } = await cartReady()
    await Cart.query().where('token', token).update({ submissionKey: null })

    const first = await client
      .get('/checkout')
      .withSession({ store_cart_token: token })
      .withInertia()
    const second = await client
      .get('/checkout')
      .withSession({ store_cart_token: token })
      .withInertia()

    assert.isString(first.inertiaProps.quote.submissionKey)
    assert.equal(first.inertiaProps.quote.submissionKey, second.inertiaProps.quote.submissionKey)
    assert.lengthOf(second.inertiaProps.quote.lines, 1)
    assert.equal(second.inertiaProps.quote.totalMinor, orderTotalMinor)
  })

  test('checkout submission without a CSRF token is rejected', async ({ client, db }) => {
    useFakeProvider()
    const { token, input } = await cartReady()

    const response = await client
      .post('/checkout')
      .withSession({ store_cart_token: token })
      .header('accept', 'application/json')
      .form(input)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Invalid or expired CSRF token')
    await db.assertEmpty('orders')
  })
})

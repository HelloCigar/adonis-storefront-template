import { test } from '@japa/runner'
import { UserFactory } from '#database/factories/user_factory'
import { orderTotalMinor, placedByGuest, resetCheckoutState } from '#tests/helpers/payments'
import { urlFor } from '@adonisjs/core/services/url_builder'

test.group('Guest orders', (group) => {
  group.each.setup(() => resetCheckoutState())

  test('a guest checkout lands on the order page with a fresh cart', async ({
    client,
    assert,
    route,
  }) => {
    const { order, response, cartToken, guestSession } = await placedByGuest(client)

    response.assertHeader('location', route('checkout.orders.show', { publicId: order.publicId! }))
    assert.notEqual(guestSession.store_cart_token, cartToken)
  })

  test('the guest who placed the order can view it', async ({ client, assert, route }) => {
    const { order, guestSession } = await placedByGuest(client)

    const page = await client
      .get(route('checkout.orders.show', { publicId: order.publicId! }))
      .withSession(guestSession)
      .withInertia()

    page.assertStatus(200)
    page.assertInertiaComponent('checkout/order')
    assert.equal(page.inertiaProps.status.amountMinor, orderTotalMinor)
    assert.notProperty(page.inertiaProps.status, 'token')
  })

  test('an outsider cannot reach the order through {action}')
    .with([
      { action: 'its page', method: 'get', name: 'checkout.orders.show' },
      { action: 'cancel', method: 'post', name: 'checkout.cancellations.store' },
      { action: 'reconcile', method: 'post', name: 'checkout.reconciliations.store' },
    ] as const)
    .run(async ({ client }, { method, name }) => {
      const { order } = await placedByGuest(client)
      const outsider = await UserFactory.create()

      const request = client[method](urlFor(name, { publicId: order.publicId! })).loginAs(outsider)
      const response = await (method === 'get' ? request.withInertia() : request.withCsrfToken())

      response.assertStatus(404)
    })

  test('a signed-in customer holding the guest session can claim the order', async ({
    client,
    assert,
  }) => {
    const { order, guestSession } = await placedByGuest(client)
    const customer = await UserFactory.create()

    const claim = await client
      .post(urlFor('checkout.access.store', { publicId: order.publicId! }))
      .loginAs(customer)
      .withSession(guestSession)
      .withCsrfToken()
      .redirects(0)

    claim.assertStatus(302)
    await order.refresh()
    assert.equal(order.userId, customer.id)
  })

  test('a claimed order cannot be claimed by another account', async ({ client, assert }) => {
    const { order, guestSession } = await placedByGuest(client)
    const customer = await UserFactory.create()
    const outsider = await UserFactory.create()
    await client
      .post(urlFor('checkout.access.store', { publicId: order.publicId! }))
      .loginAs(customer)
      .withSession(guestSession)
      .withCsrfToken()
      .redirects(0)

    const stolen = await client
      .post(urlFor('checkout.access.store', { publicId: order.publicId! }))
      .loginAs(outsider)
      .withSession(guestSession)
      .withCsrfToken()

    stolen.assertStatus(409)
    await order.refresh()
    assert.equal(order.userId, customer.id)
  })

  test("a claimed order's account link leads to its order page", async ({ client, route }) => {
    const { order, guestSession } = await placedByGuest(client)
    const customer = await UserFactory.create()
    await client
      .post(urlFor('checkout.access.store', { publicId: order.publicId! }))
      .loginAs(customer)
      .withSession(guestSession)
      .withCsrfToken()
      .redirects(0)

    const account = await client
      .get(route('orders.show', { id: order.id }))
      .loginAs(customer)
      .redirects(0)

    account.assertHeader('location', route('checkout.orders.show', { publicId: order.publicId! }))
  })
})

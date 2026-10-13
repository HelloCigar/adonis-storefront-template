import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import type User from '#models/account/user'
import type Product from '#models/catalog/product'
import ProductReview from '#models/catalog/product_review'
import Shipment from '#models/checkout/shipment'
import type { ShipmentState } from '#services/checkout/state_service'
import { OrderFactory } from '#database/factories/order_factory'
import { OrderLineItemFactory } from '#database/factories/order_line_item_factory'
import { ProductFactory } from '#database/factories/product_factory'
import { UserFactory } from '#database/factories/user_factory'
import { urlFor } from '@adonisjs/core/services/url_builder'

const storeMessage = 'Thanks for your review. It will appear once the store approves it.'
const updateMessage = 'Review updated. It will appear again once the store approves it.'
const publicReviewKeys = [
  'id',
  'rating',
  'title',
  'body',
  'status',
  'authorName',
  'createdAt',
  'updatedAt',
]

const publishedProduct = (values: Partial<Product> = {}) =>
  ProductFactory.apply('published').merge(values).create()
const account = (values: Partial<User> = {}) => UserFactory.merge(values).create()

/**
 * An order with one line for the product and a shipment in the given state. A null user is a
 * guest order that has not been claimed.
 */
async function purchase(
  user: User | null,
  product: Product,
  state: ShipmentState = 'delivered',
  placedAt: DateTime = DateTime.utc(),
  email?: string
) {
  const order = await OrderFactory.merge({
    userId: user?.id ?? null,
    processedAt: placedAt,
    createdAt: placedAt,
    ...(email ? { email } : {}),
  }).create()
  await OrderLineItemFactory.merge({ orderId: order.id, productId: product.id }).create()
  await Shipment.create({ orderId: order.id, state })
  return order
}

/** A stored review, written by a fresh account unless `userId` is given. */
async function review(product: Product, values: Partial<ProductReview> = {}) {
  let userId = values.userId
  if (!userId) {
    const author = await account()
    userId = author.id
  }
  return ProductReview.create({
    rating: 5,
    title: null,
    body: null,
    status: 'approved',
    ...values,
    productId: product.id,
    userId,
  })
}

const countReviews = async () => {
  const rows = await ProductReview.all()
  return rows.length
}
const storeUrl = (product: Product) => urlFor('reviews.store', { productId: product.id })
const reviewUrl = (row: ProductReview | { id: string }) => urlFor('reviews.update', { id: row.id })
const productPath = (product: Product) => urlFor('products.show', { handle: product.handle })
const errorFields = (body: { errors?: { field: string }[] }) =>
  (body.errors ?? []).map((error) => error.field)

test.group('Product reviews | writing', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('guests are sent to the login page', async ({ client, assert, route }) => {
    const product = await publishedProduct()
    const existing = await review(product)

    const store = await client
      .post(storeUrl(product))
      .withCsrfToken()
      .redirects(0)
      .json({ rating: 5 })
    store.assertStatus(302)
    store.assertHeader('location', route('session.create'))

    const update = await client
      .patch(reviewUrl(existing))
      .withCsrfToken()
      .redirects(0)
      .json({ rating: 1 })
    update.assertStatus(302)
    update.assertHeader('location', route('session.create'))

    const destroy = await client.delete(reviewUrl(existing)).withCsrfToken().redirects(0)
    destroy.assertStatus(302)
    destroy.assertHeader('location', route('session.create'))

    assert.equal(await countReviews(), 1)
    await existing.refresh()
    assert.equal(existing.rating, 5)
  })

  test('refuses accounts without a delivered order for the product', async ({ client, assert }) => {
    const product = await publishedProduct()
    const otherProduct = await publishedProduct()

    const inTransit = await account()
    await purchase(inTransit, product, 'shipped')

    const someoneElse = await account()
    await purchase(await account(), product, 'delivered')

    const wrongProduct = await account()
    await purchase(wrongProduct, otherProduct, 'delivered')

    // A guest order placed with the same email still has to be claimed first.
    const unclaimed = await account({ email: 'unclaimed-review@example.com' })
    await purchase(null, product, 'delivered', DateTime.utc(), 'unclaimed-review@example.com')

    const noOrders = await account()
    const staffWithoutPurchase = await account({ role: 'staff' })

    for (const user of [
      inTransit,
      someoneElse,
      wrongProduct,
      unclaimed,
      noOrders,
      staffWithoutPurchase,
    ]) {
      const response = await client
        .post(storeUrl(product))
        .loginAs(user)
        .withCsrfToken()
        .accept('json')
        .json({ rating: 5, title: 'Great' })
      response.assertStatus(403)
    }
    assert.equal(await countReviews(), 0)
  })

  test('an eligible customer creates a pending review tied to the latest delivered order', async ({
    client,
    assert,
  }) => {
    const customer = await account({ firstName: 'Maria', lastName: 'Santos' })
    const product = await publishedProduct()
    const older = await purchase(customer, product, 'delivered', DateTime.utc().minus({ days: 10 }))
    const latest = await purchase(customer, product, 'delivered', DateTime.utc().minus({ days: 2 }))
    // Newest of all, but not delivered yet, so it cannot be the eligible order.
    await purchase(customer, product, 'shipped', DateTime.utc().minus({ days: 1 }))

    const response = await client
      .post(storeUrl(product))
      .loginAs(customer)
      .withCsrfToken()
      .redirects(0)
      .json({ rating: 4, title: '  Lovely lamp  ', body: '  Warm, even light.  ' })
    response.assertStatus(302)
    response.assertHeader('location', productPath(product))
    response.assertFlashMessage('success', storeMessage)

    const saved = await ProductReview.query()
      .where('product_id', product.id)
      .where('user_id', customer.id)
      .firstOrFail()
    assert.equal(saved.rating, 4)
    assert.equal(saved.title, 'Lovely lamp')
    assert.equal(saved.body, 'Warm, even light.')
    assert.equal(saved.status, 'pending')
    assert.equal(saved.orderId, latest.id)
    assert.notEqual(saved.orderId, older.id)
    assert.isNull(saved.moderatedById)
    assert.isNull(saved.moderatedAt)
    assert.exists(saved.createdAt)
  })

  test('staff and admins may review their own delivered purchases', async ({ client, assert }) => {
    const product = await publishedProduct()
    for (const role of ['staff', 'admin'] as const) {
      const user = await account({ role })
      const order = await purchase(user, product)
      const response = await client
        .post(storeUrl(product))
        .loginAs(user)
        .withCsrfToken()
        .redirects(0)
        .json({ rating: 5 })
      response.assertStatus(302)
      response.assertHeader('location', productPath(product))
      const saved = await ProductReview.query().where('user_id', user.id).firstOrFail()
      assert.equal(saved.status, 'pending')
      assert.equal(saved.orderId, order.id)
    }
  })

  test('a second review of the same product is refused', async ({ client, assert }) => {
    const customer = await account()
    const product = await publishedProduct()
    await purchase(customer, product)
    await review(product, { userId: customer.id, status: 'pending', rating: 3 })

    const again = await client
      .post(storeUrl(product))
      .loginAs(customer)
      .withCsrfToken()
      .accept('json')
      .json({ rating: 5, title: 'Second try' })
    again.assertStatus(403)

    const rows = await ProductReview.query().where('user_id', customer.id)
    assert.lengthOf(rows, 1)
    assert.equal(rows[0].rating, 3)
  })

  test('validates the rating, title, and body', async ({ client, assert }) => {
    const customer = await account()
    const product = await publishedProduct()
    await purchase(customer, product)

    const invalid: [Record<string, unknown>, string][] = [
      [{ rating: 0 }, 'rating'],
      [{ rating: 6 }, 'rating'],
      [{ rating: 3.5 }, 'rating'],
      [{ title: 'No rating' }, 'rating'],
      [{ rating: 4, title: 'x'.repeat(121) }, 'title'],
      [{ rating: 4, body: 'x'.repeat(2001) }, 'body'],
    ]
    for (const [payload, field] of invalid) {
      const response = await client
        .post(storeUrl(product))
        .loginAs(customer)
        .withCsrfToken()
        .accept('json')
        .json(payload)
      response.assertStatus(422)
      assert.include(errorFields(response.body()), field, JSON.stringify(payload))
    }
    assert.equal(await countReviews(), 0)
  })

  test('stores empty title and body as null and accepts the maximum lengths', async ({
    client,
    assert,
  }) => {
    const customer = await account()
    const product = await publishedProduct()
    const longest = await publishedProduct()
    await purchase(customer, product)
    await purchase(customer, longest)

    const blank = await client
      .post(storeUrl(product))
      .loginAs(customer)
      .withCsrfToken()
      .redirects(0)
      .json({ rating: 3, title: '', body: '   ' })
    blank.assertStatus(302)
    const blankReview = await ProductReview.query()
      .where('product_id', product.id)
      .where('user_id', customer.id)
      .firstOrFail()
    assert.equal(blankReview.rating, 3)
    assert.isNull(blankReview.title)
    assert.isNull(blankReview.body)

    const full = await client
      .post(storeUrl(longest))
      .loginAs(customer)
      .withCsrfToken()
      .redirects(0)
      .json({ rating: 1, title: 't'.repeat(120), body: 'b'.repeat(2000) })
    full.assertStatus(302)
    const fullReview = await ProductReview.query()
      .where('product_id', longest.id)
      .where('user_id', customer.id)
      .firstOrFail()
    assert.lengthOf(fullReview.title!, 120)
    assert.lengthOf(fullReview.body!, 2000)
  })

  test('unpublished and missing products return 404', async ({ client, assert }) => {
    const customer = await account()
    const draft = await ProductFactory.merge({ status: 'draft', publishedAt: null }).create()
    const unscheduled = await ProductFactory.merge({ status: 'active', publishedAt: null }).create()
    await purchase(customer, draft)
    await purchase(customer, unscheduled)

    for (const url of [
      storeUrl(draft),
      storeUrl(unscheduled),
      urlFor('reviews.store', { productId: '01ARZ3NDEKTSV4RRFFQ69G5FAV' }),
    ]) {
      const response = await client
        .post(url)
        .loginAs(customer)
        .withCsrfToken()
        .accept('json')
        .json({ rating: 5 })
      response.assertStatus(404)
    }
    assert.equal(await countReviews(), 0)
  })

  test('the author edits a moderated review, which returns it to pending', async ({
    client,
    assert,
  }) => {
    const customer = await account()
    const moderator = await account({ role: 'staff' })
    const product = await publishedProduct()
    const order = await purchase(customer, product)
    const existing = await review(product, {
      userId: customer.id,
      orderId: order.id,
      rating: 5,
      title: 'Perfect',
      body: 'Loved it.',
      status: 'approved',
      moderatedById: moderator.id,
      moderatedAt: DateTime.utc().minus({ days: 1 }),
    })

    const invalid = await client
      .patch(reviewUrl(existing))
      .loginAs(customer)
      .withCsrfToken()
      .accept('json')
      .json({ rating: 0 })
    invalid.assertStatus(422)
    assert.include(errorFields(invalid.body()), 'rating')
    await existing.refresh()
    assert.equal(existing.status, 'approved')
    assert.equal(existing.rating, 5)

    const response = await client
      .patch(reviewUrl(existing))
      .loginAs(customer)
      .withCsrfToken()
      .redirects(0)
      .json({ rating: 2, title: '  Changed my mind  ', body: '' })
    response.assertStatus(302)
    response.assertHeader('location', productPath(product))
    response.assertFlashMessage('success', updateMessage)

    await existing.refresh()
    assert.equal(existing.rating, 2)
    assert.equal(existing.title, 'Changed my mind')
    assert.isNull(existing.body)
    assert.equal(existing.status, 'pending')
    assert.isNull(existing.moderatedById)
    assert.isNull(existing.moderatedAt)
    assert.equal(existing.userId, customer.id)
    assert.equal(existing.productId, product.id)
    assert.equal(await countReviews(), 1)
  })

  test('only the author may edit or delete a review, including for admins', async ({
    client,
    assert,
  }) => {
    const author = await account()
    const product = await publishedProduct()
    await purchase(author, product)
    const existing = await review(product, {
      userId: author.id,
      rating: 4,
      title: 'Solid',
      status: 'approved',
    })
    const otherCustomer = await account()
    // Even a customer who could review the product cannot touch someone else's review.
    await purchase(otherCustomer, product)
    const admin = await account({ role: 'admin' })
    const staff = await account({ role: 'staff' })

    for (const user of [otherCustomer, admin, staff]) {
      const update = await client
        .patch(reviewUrl(existing))
        .loginAs(user)
        .withCsrfToken()
        .accept('json')
        .json({ rating: 1, title: 'Hijacked' })
      update.assertStatus(403)

      const destroy = await client
        .delete(reviewUrl(existing))
        .loginAs(user)
        .withCsrfToken()
        .accept('json')
      destroy.assertStatus(403)
    }

    await existing.refresh()
    assert.equal(existing.rating, 4)
    assert.equal(existing.title, 'Solid')
    assert.equal(existing.status, 'approved')
    assert.equal(existing.userId, author.id)
  })

  test('editing or deleting a missing review returns 404', async ({ client }) => {
    const customer = await account()
    const update = await client
      .patch(reviewUrl({ id: '01ARZ3NDEKTSV4RRFFQ69G5FAV' }))
      .loginAs(customer)
      .withCsrfToken()
      .accept('json')
      .json({ rating: 3 })
    update.assertStatus(404)

    const destroy = await client
      .delete(reviewUrl({ id: '01ARZ3NDEKTSV4RRFFQ69G5FAV' }))
      .loginAs(customer)
      .withCsrfToken()
      .accept('json')
    destroy.assertStatus(404)
  })

  test('the author deletes their review in any status', async ({ client, assert }) => {
    const customer = await account()
    const product = await publishedProduct()
    await purchase(customer, product)
    const hidden = await review(product, { userId: customer.id, status: 'hidden' })
    const untouched = await review(product)

    const response = await client
      .delete(reviewUrl(hidden))
      .loginAs(customer)
      .withCsrfToken()
      .redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', productPath(product))
    response.assertFlashMessage('success', 'Review deleted')

    assert.isNull(await ProductReview.find(hidden.id))
    assert.isNotNull(await ProductReview.find(untouched.id))

    // With the review gone, the still-eligible customer may write a new one.
    const page = await client.get(productPath(product)).loginAs(customer).withInertia()
    page.assertStatus(200)
    assert.isNull(page.inertiaProps.viewerReview)
    assert.isTrue(page.inertiaProps.canReview)
  })
})

test.group('Product reviews | product page', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('summarises approved reviews only', async ({ client, assert }) => {
    const product = await publishedProduct()

    const empty = await client.get(productPath(product)).withInertia()
    empty.assertStatus(200)
    empty.assertInertiaComponent('product/[handle]')
    assert.deepEqual(empty.inertiaProps.reviewSummary, {
      average: null,
      count: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    })
    assert.deepEqual(empty.inertiaProps.reviews.data, [])

    await review(product, { rating: 5 })
    await review(product, { rating: 4 })
    await review(product, { rating: 4 })
    await review(product, { rating: 1, status: 'pending' })
    await review(product, { rating: 1, status: 'hidden' })
    // Another product's reviews never count.
    await review(await publishedProduct(), { rating: 1 })

    const page = await client.get(productPath(product)).withInertia()
    page.assertStatus(200)
    // 13 / 3 = 4.333... rounds down to one decimal place.
    assert.deepEqual(page.inertiaProps.reviewSummary, {
      average: 4.3,
      count: 3,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 2, 5: 1 },
    })
    assert.lengthOf(page.inertiaProps.reviews.data, 3)
    assert.isTrue(
      page.inertiaProps.reviews.data.every((item: { status: string }) => item.status === 'approved')
    )

    const roundsUp = await publishedProduct()
    await review(roundsUp, { rating: 5 })
    await review(roundsUp, { rating: 5 })
    await review(roundsUp, { rating: 4 })
    const second = await client.get(productPath(roundsUp)).withInertia()
    // 14 / 3 = 4.666... rounds up to one decimal place.
    assert.equal(second.inertiaProps.reviewSummary.average, 4.7)
    assert.equal(second.inertiaProps.reviewSummary.count, 3)
  })

  test('lists approved reviews newest first, ten per page, with reviewsPage', async ({
    client,
    assert,
  }) => {
    const product = await publishedProduct()
    const now = DateTime.utc().startOf('second')
    for (let index = 0; index < 12; index++) {
      await review(product, {
        title: `Review ${index}`,
        createdAt: now.minus({ hours: index + 1 }),
      })
    }
    await review(product, { title: 'Pending newest', status: 'pending', createdAt: now })
    await review(product, { title: 'Hidden newest', status: 'hidden', createdAt: now })

    const first = await client.get(productPath(product)).withInertia()
    first.assertStatus(200)
    assert.deepEqual(
      first.inertiaProps.reviews.data.map((item: { title: string }) => item.title),
      Array.from({ length: 10 }, (_, index) => `Review ${index}`)
    )
    assert.equal(first.inertiaProps.reviews.metadata.total, 12)
    assert.equal(first.inertiaProps.reviews.metadata.perPage, 10)
    assert.equal(first.inertiaProps.reviews.metadata.currentPage, 1)

    const second = await client.get(`${productPath(product)}?reviewsPage=2`).withInertia()
    second.assertStatus(200)
    assert.deepEqual(
      second.inertiaProps.reviews.data.map((item: { title: string }) => item.title),
      ['Review 10', 'Review 11']
    )
    assert.equal(second.inertiaProps.reviews.metadata.currentPage, 2)
    // The summary covers every approved review, not just the current page.
    assert.equal(second.inertiaProps.reviewSummary.count, 12)
  })

  test('breaks created_at ties by id, newest id first', async ({ client, assert }) => {
    const product = await publishedProduct()
    const at = DateTime.utc().startOf('second').minus({ days: 1 })
    const earlier = await review(product, { title: 'First saved', createdAt: at })
    const later = await review(product, { title: 'Second saved', createdAt: at })
    assert.isTrue(later.id > earlier.id)

    const page = await client.get(productPath(product)).withInertia()
    assert.deepEqual(
      page.inertiaProps.reviews.data.map((item: { id: string }) => item.id),
      [later.id, earlier.id]
    )
  })

  test('public reviews show a short author name and no private fields', async ({
    client,
    assert,
  }) => {
    const product = await publishedProduct()
    const maria = await account({
      firstName: 'Maria',
      lastName: 'Santos',
      fullName: 'Maria Santos',
      email: 'maria-review@example.com',
    })
    const juan = await account({
      firstName: null,
      lastName: null,
      fullName: 'Juan dela Cruz',
      email: 'juan-review@example.com',
    })
    const nameless = await account({
      firstName: null,
      lastName: null,
      fullName: null,
      email: 'nameless-review@example.com',
    })
    const order = await purchase(maria, product)
    const fromMaria = await review(product, {
      userId: maria.id,
      orderId: order.id,
      rating: 5,
      title: 'Great',
      body: 'Would buy again.',
      createdAt: DateTime.utc().minus({ hours: 1 }),
    })
    const fromJuan = await review(product, {
      userId: juan.id,
      createdAt: DateTime.utc().minus({ hours: 2 }),
    })
    const fromNameless = await review(product, {
      userId: nameless.id,
      createdAt: DateTime.utc().minus({ hours: 3 }),
    })

    const page = await client.get(productPath(product)).withInertia()
    page.assertStatus(200)
    const items: Record<string, unknown>[] = page.inertiaProps.reviews.data
    const byId = new Map(items.map((item) => [item.id, item]))
    assert.equal(byId.get(fromMaria.id)?.authorName, 'Maria S.')
    assert.equal(byId.get(fromJuan.id)?.authorName, 'Juan')
    assert.equal(byId.get(fromNameless.id)?.authorName, 'Customer')

    const maryItem = byId.get(fromMaria.id)!
    assert.sameMembers(Object.keys(maryItem), publicReviewKeys)
    assert.deepInclude(maryItem, {
      id: fromMaria.id,
      rating: 5,
      title: 'Great',
      body: 'Would buy again.',
      status: 'approved',
    })
    for (const item of items) {
      assert.notProperty(item, 'email')
      assert.notProperty(item, 'userId')
      assert.notProperty(item, 'orderId')
      assert.notProperty(item, 'user')
    }

    const serialized = JSON.stringify(page.inertiaProps)
    for (const email of [maria.email, juan.email, nameless.email]) {
      assert.notInclude(serialized, email)
    }
  })

  test("viewerReview returns the signed-in user's own review in any status", async ({
    client,
    assert,
  }) => {
    const customer = await account()
    const product = await publishedProduct()
    await purchase(customer, product)
    await review(product, { title: 'Someone else', status: 'approved' })
    const own = await review(product, {
      userId: customer.id,
      rating: 3,
      title: 'My take',
      status: 'pending',
    })

    const pending = await client.get(productPath(product)).loginAs(customer).withInertia()
    pending.assertStatus(200)
    assert.deepInclude(pending.inertiaProps.viewerReview, {
      id: own.id,
      rating: 3,
      title: 'My take',
      status: 'pending',
    })
    assert.isFalse(pending.inertiaProps.canReview)
    assert.notInclude(
      pending.inertiaProps.reviews.data.map((item: { id: string }) => item.id),
      own.id
    )
    assert.equal(pending.inertiaProps.reviewSummary.count, 1)

    own.status = 'hidden'
    await own.save()
    const hidden = await client.get(productPath(product)).loginAs(customer).withInertia()
    assert.equal(hidden.inertiaProps.viewerReview.id, own.id)
    assert.equal(hidden.inertiaProps.viewerReview.status, 'hidden')
    assert.notInclude(
      hidden.inertiaProps.reviews.data.map((item: { id: string }) => item.id),
      own.id
    )
    assert.isFalse(hidden.inertiaProps.canReview)

    own.status = 'approved'
    await own.save()
    const approved = await client.get(productPath(product)).loginAs(customer).withInertia()
    assert.equal(approved.inertiaProps.viewerReview.id, own.id)
    assert.equal(approved.inertiaProps.viewerReview.status, 'approved')
    assert.include(
      approved.inertiaProps.reviews.data.map((item: { id: string }) => item.id),
      own.id
    )

    const stranger = await account()
    const other = await client.get(productPath(product)).loginAs(stranger).withInertia()
    assert.isNull(other.inertiaProps.viewerReview)
  })

  test('canReview is true only for a signed-in eligible account without a review', async ({
    client,
    assert,
  }) => {
    const product = await publishedProduct()
    await review(product, { rating: 4 })

    const guest = await client.get(productPath(product)).withInertia()
    guest.assertStatus(200)
    assert.isNull(guest.inertiaProps.viewerReview)
    assert.isFalse(guest.inertiaProps.canReview)

    const eligible = await account()
    await purchase(eligible, product)
    const inTransit = await account()
    await purchase(inTransit, product, 'shipped')
    const otherProductBuyer = await account()
    await purchase(otherProductBuyer, await publishedProduct())
    const reviewed = await account()
    await purchase(reviewed, product)
    await review(product, { userId: reviewed.id, status: 'pending' })
    const staffBuyer = await account({ role: 'staff' })
    await purchase(staffBuyer, product)
    const staffWithoutPurchase = await account({ role: 'staff' })

    const expectations: [User, boolean][] = [
      [eligible, true],
      [inTransit, false],
      [otherProductBuyer, false],
      [reviewed, false],
      [staffBuyer, true],
      [staffWithoutPurchase, false],
    ]
    for (const [user, expected] of expectations) {
      const page = await client.get(productPath(product)).loginAs(user).withInertia()
      page.assertStatus(200)
      assert.strictEqual(page.inertiaProps.canReview, expected, `user ${user.id}`)
    }
  })
})

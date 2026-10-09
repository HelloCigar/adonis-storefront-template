import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import type User from '#models/account/user'
import type Product from '#models/catalog/product'
import ProductReview from '#models/catalog/product_review'
import Shipment from '#models/checkout/shipment'
import { OrderFactory } from '#database/factories/order_factory'
import { OrderLineItemFactory } from '#database/factories/order_line_item_factory'
import { ProductFactory } from '#database/factories/product_factory'
import { UserFactory } from '#database/factories/user_factory'

const sellerReviewKeys = [
  'id',
  'rating',
  'title',
  'body',
  'status',
  'authorName',
  'customerEmail',
  'product',
  'orderId',
  'moderatedAt',
  'createdAt',
  'updatedAt',
]

const account = (values: Partial<User> = {}) => UserFactory.merge(values).create()
const staffMember = () => account({ role: 'staff' })
const publishedProduct = (values: Partial<Product> = {}) =>
  ProductFactory.apply('published').merge(values).create()

/** A stored review, written by a fresh account unless `userId` is given. */
async function review(product: Product, values: Partial<ProductReview> = {}) {
  let userId = values.userId
  if (!userId) {
    const author = await account()
    userId = author.id
  }
  return ProductReview.create({
    rating: 4,
    title: 'Nice',
    body: 'Does the job.',
    status: 'pending',
    ...values,
    productId: product.id,
    userId,
  })
}

async function deliveredOrder(user: User, product: Product) {
  const order = await OrderFactory.merge({ userId: user.id }).create()
  await OrderLineItemFactory.merge({ orderId: order.id, productId: product.id }).create()
  await Shipment.create({ orderId: order.id, state: 'delivered' })
  return order
}

const reviewUrl = (row: ProductReview | { id: number }) => `/seller/reviews/${row.id}`
const ids = (items: { id: number }[]) => items.map((item) => item.id)

test.group('Seller reviews | access', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('guests go to login and customers are refused', async ({ client, assert }) => {
    const product = await publishedProduct()
    const existing = await review(product)
    const customer = await account()

    const guestIndex = await client.get('/seller/reviews').redirects(0)
    guestIndex.assertStatus(302)
    guestIndex.assertHeader('location', '/login')

    const guestUpdate = await client
      .patch(reviewUrl(existing))
      .withCsrfToken()
      .redirects(0)
      .json({ status: 'approved' })
    guestUpdate.assertStatus(302)
    guestUpdate.assertHeader('location', '/login')

    const customerIndex = await client.get('/seller/reviews').loginAs(customer).accept('json')
    customerIndex.assertStatus(403)

    const customerUpdate = await client
      .patch(reviewUrl(existing))
      .loginAs(customer)
      .withCsrfToken()
      .accept('json')
      .json({ status: 'approved' })
    customerUpdate.assertStatus(403)

    await existing.refresh()
    assert.equal(existing.status, 'pending')
    assert.isNull(existing.moderatedById)
    assert.isNull(existing.moderatedAt)
  })
})

test.group('Seller reviews | index', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('defaults to pending reviews, newest first, with counts across all reviews', async ({
    client,
    assert,
  }) => {
    const staff = await staffMember()
    const product = await publishedProduct()
    const now = DateTime.utc().startOf('second')
    const olderPending = await review(product, { createdAt: now.minus({ hours: 3 }) })
    const newerPending = await review(product, { createdAt: now.minus({ hours: 1 }) })
    const approved = await review(product, {
      status: 'approved',
      createdAt: now.minus({ hours: 2 }),
    })
    const hidden = await review(product, { status: 'hidden', createdAt: now.minus({ hours: 4 }) })
    const otherProductReview = await review(await publishedProduct(), {
      status: 'approved',
      createdAt: now,
    })

    const page = await client.get('/seller/reviews').loginAs(staff).withInertia()
    page.assertStatus(200)
    page.assertInertiaComponent('seller/reviews')
    assert.deepEqual(page.inertiaProps.filters, { status: 'pending' })
    assert.deepEqual(ids(page.inertiaProps.reviews.data), [newerPending.id, olderPending.id])
    assert.deepEqual(page.inertiaProps.counts, { pending: 2, approved: 2, hidden: 1 })

    const approvedPage = await client
      .get('/seller/reviews?status=approved')
      .loginAs(staff)
      .withInertia()
    approvedPage.assertStatus(200)
    assert.deepEqual(approvedPage.inertiaProps.filters, { status: 'approved' })
    assert.include(ids(approvedPage.inertiaProps.reviews.data), approved.id)
    assert.lengthOf(approvedPage.inertiaProps.reviews.data, 2)
    // Counts do not depend on the selected filter.
    assert.deepEqual(approvedPage.inertiaProps.counts, { pending: 2, approved: 2, hidden: 1 })

    const hiddenPage = await client
      .get('/seller/reviews?status=hidden')
      .loginAs(staff)
      .withInertia()
    assert.deepEqual(hiddenPage.inertiaProps.filters, { status: 'hidden' })
    assert.deepEqual(ids(hiddenPage.inertiaProps.reviews.data), [hidden.id])

    const allPage = await client.get('/seller/reviews?status=all').loginAs(staff).withInertia()
    assert.deepEqual(allPage.inertiaProps.filters, { status: 'all' })
    assert.lengthOf(allPage.inertiaProps.reviews.data, 5)
    assert.deepEqual(ids(allPage.inertiaProps.reviews.data), [
      otherProductReview.id,
      newerPending.id,
      approved.id,
      olderPending.id,
      hidden.id,
    ])
    assert.equal(allPage.inertiaProps.reviews.metadata.total, 5)
  })

  test('each item carries the customer email, product, and moderation fields', async ({
    client,
    assert,
  }) => {
    const staff = await staffMember()
    const product = await publishedProduct({ title: 'Bunny lamp', handle: 'bunny-lamp-review' })
    const author = await account({
      firstName: 'Maria',
      lastName: 'Santos',
      fullName: 'Maria Santos',
      email: 'maria-moderation@example.com',
    })
    const order = await deliveredOrder(author, product)
    const existing = await review(product, {
      userId: author.id,
      orderId: order.id,
      rating: 2,
      title: 'Too dim',
      body: 'Not bright enough for reading.',
    })

    const page = await client.get('/seller/reviews').loginAs(staff).withInertia()
    page.assertStatus(200)
    assert.lengthOf(page.inertiaProps.reviews.data, 1)
    const item = page.inertiaProps.reviews.data[0]
    assert.sameMembers(Object.keys(item), sellerReviewKeys)
    assert.deepInclude(item, {
      id: existing.id,
      rating: 2,
      title: 'Too dim',
      body: 'Not bright enough for reading.',
      status: 'pending',
      authorName: 'Maria S.',
      customerEmail: 'maria-moderation@example.com',
      orderId: order.id,
      moderatedAt: null,
    })
    assert.deepEqual(item.product, {
      id: product.id,
      title: 'Bunny lamp',
      handle: 'bunny-lamp-review',
    })
    assert.exists(item.createdAt)
  })

  test('pages 25 reviews at a time', async ({ client, assert }) => {
    const staff = await staffMember()
    const product = await publishedProduct()
    const now = DateTime.utc().startOf('second')
    const rows: ProductReview[] = []
    for (let index = 0; index < 27; index++) {
      rows.push(await review(product, { createdAt: now.minus({ minutes: index + 1 }) }))
    }

    const first = await client.get('/seller/reviews').loginAs(staff).withInertia()
    assert.lengthOf(first.inertiaProps.reviews.data, 25)
    assert.equal(first.inertiaProps.reviews.data[0].id, rows[0].id)
    assert.equal(first.inertiaProps.reviews.metadata.total, 27)
    assert.equal(first.inertiaProps.reviews.metadata.perPage, 25)

    const second = await client.get('/seller/reviews?page=2').loginAs(staff).withInertia()
    assert.deepEqual(ids(second.inertiaProps.reviews.data), [rows[25].id, rows[26].id])
    assert.equal(second.inertiaProps.reviews.metadata.currentPage, 2)
  })
})

test.group('Seller reviews | moderation', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('staff approve and hide a review without changing its text', async ({ client, assert }) => {
    const staff = await staffMember()
    const product = await publishedProduct()
    const existing = await review(product, { rating: 3, title: 'Okay', body: 'Fine overall.' })
    const back = '/seller/reviews?status=pending'

    const before = DateTime.utc().minus({ seconds: 5 })
    const approve = await client
      .patch(reviewUrl(existing))
      .loginAs(staff)
      .withCsrfToken()
      .header('referer', back)
      .redirects(0)
      // Text fields are ignored; staff only change the status.
      .json({ status: 'approved', rating: 1, title: 'Edited by staff', body: 'Edited' })
    approve.assertStatus(302)
    approve.assertHeader('location', back)
    approve.assertFlashMessage('success', 'Review approved')

    await existing.refresh()
    assert.equal(existing.status, 'approved')
    assert.equal(existing.moderatedById, staff.id)
    assert.isNotNull(existing.moderatedAt)
    assert.isAtLeast(existing.moderatedAt!.toMillis(), before.toMillis())
    assert.equal(existing.rating, 3)
    assert.equal(existing.title, 'Okay')
    assert.equal(existing.body, 'Fine overall.')

    const hide = await client
      .patch(reviewUrl(existing))
      .loginAs(staff)
      .withCsrfToken()
      .header('referer', '/seller/reviews?status=approved')
      .redirects(0)
      .json({ status: 'hidden' })
    hide.assertStatus(302)
    hide.assertHeader('location', '/seller/reviews?status=approved')
    hide.assertFlashMessage('success', 'Review hidden')

    await existing.refresh()
    assert.equal(existing.status, 'hidden')
    assert.equal(existing.moderatedById, staff.id)
    assert.isNotNull(existing.moderatedAt)
    assert.equal(existing.rating, 3)
    assert.equal(existing.title, 'Okay')
    assert.equal(existing.body, 'Fine overall.')
    assert.lengthOf(await ProductReview.all(), 1)
  })

  test('moderation status must be approved or hidden', async ({ client, assert }) => {
    const staff = await staffMember()
    const product = await publishedProduct()
    const existing = await review(product, { status: 'approved' })

    for (const payload of [{ status: 'pending' }, { status: 'deleted' }, {}]) {
      const response = await client
        .patch(reviewUrl(existing))
        .loginAs(staff)
        .withCsrfToken()
        .accept('json')
        .json(payload)
      response.assertStatus(422)
      assert.include(
        response.body().errors.map((error: { field: string }) => error.field),
        'status',
        JSON.stringify(payload)
      )
    }

    await existing.refresh()
    assert.equal(existing.status, 'approved')
    assert.isNull(existing.moderatedById)
    assert.isNull(existing.moderatedAt)
  })

  test('moderating a missing review returns 404', async ({ client }) => {
    const staff = await staffMember()
    const response = await client
      .patch(reviewUrl({ id: 999999 }))
      .loginAs(staff)
      .withCsrfToken()
      .accept('json')
      .json({ status: 'approved' })
    response.assertStatus(404)
  })

  test('admins can moderate reviews', async ({ client, assert }) => {
    const admin = await account({ role: 'admin' })
    const product = await publishedProduct()
    const existing = await review(product)

    const page = await client.get('/seller/reviews').loginAs(admin).withInertia()
    page.assertStatus(200)
    assert.deepEqual(ids(page.inertiaProps.reviews.data), [existing.id])

    const response = await client
      .patch(reviewUrl(existing))
      .loginAs(admin)
      .withCsrfToken()
      .header('referer', '/seller/reviews')
      .redirects(0)
      .json({ status: 'approved' })
    response.assertStatus(302)
    response.assertFlashMessage('success', 'Review approved')

    await existing.refresh()
    assert.equal(existing.status, 'approved')
    assert.equal(existing.moderatedById, admin.id)
    assert.isNotNull(existing.moderatedAt)
  })

  test('an approved review appears on the product page; a hidden one does not', async ({
    client,
    assert,
  }) => {
    const staff = await staffMember()
    const product = await publishedProduct()
    const existing = await review(product, { rating: 5, title: 'Lovely' })

    const before = await client.get(`/product/${product.handle}`).withInertia()
    assert.deepEqual(before.inertiaProps.reviews.data, [])

    await client
      .patch(reviewUrl(existing))
      .loginAs(staff)
      .withCsrfToken()
      .redirects(0)
      .json({ status: 'approved' })
    const approved = await client.get(`/product/${product.handle}`).withInertia()
    assert.deepEqual(ids(approved.inertiaProps.reviews.data), [existing.id])
    assert.equal(approved.inertiaProps.reviewSummary.count, 1)
    assert.equal(approved.inertiaProps.reviewSummary.average, 5)

    await client
      .patch(reviewUrl(existing))
      .loginAs(staff)
      .withCsrfToken()
      .redirects(0)
      .json({ status: 'hidden' })
    const hidden = await client.get(`/product/${product.handle}`).withInertia()
    assert.deepEqual(hidden.inertiaProps.reviews.data, [])
    assert.equal(hidden.inertiaProps.reviewSummary.count, 0)
    assert.isNull(hidden.inertiaProps.reviewSummary.average)
  })
})

import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import ProductReview from '#models/catalog/product_review'
import Shipment from '#models/checkout/shipment'
import { OrderFactory } from '#database/factories/order_factory'
import { OrderLineItemFactory } from '#database/factories/order_line_item_factory'
import { ProductVariantFactory } from '#database/factories/product_variant_factory'
import { UserFactory } from '#database/factories/user_factory'

test.group('Product reviews', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('a customer reviews a delivered product, staff approve it, and shoppers see it', async ({
    visit,
    browserContext,
    assert,
  }) => {
    const variant = await ProductVariantFactory.merge({ priceAmount: 899 }).create()
    await variant.load('product')
    const product = variant.product
    const customer = await UserFactory.merge({
      firstName: 'Maria',
      lastName: 'Santos',
      fullName: 'Maria Santos',
      email: 'maria-browser-review@example.com',
    }).create()
    const order = await OrderFactory.merge({ userId: customer.id }).create()
    await OrderLineItemFactory.merge({
      orderId: order.id,
      productVariantId: variant.id,
    }).create()
    await Shipment.create({ orderId: order.id, state: 'delivered' })
    const staff = await UserFactory.merge({ role: 'staff' }).create()
    const errors: string[] = []

    // A guest sees the empty state and the sign-in prompt.
    const guest = await visit(`/product/${product.handle}`)
    guest.on('pageerror', (error) => errors.push(error.message))
    const guestSection = guest.locator('#reviews')
    await guestSection.getByText('No reviews yet.', { exact: true }).waitFor()
    await guestSection.getByText(/Sign in to review products you.ve received\./).waitFor()

    // The eligible customer writes a review and sees it waiting for approval.
    await browserContext.loginAs(customer)
    const page = await visit(`/product/${product.handle}`)
    page.on('pageerror', (error) => errors.push(error.message))
    const section = page.locator('#reviews')
    await section.getByRole('button', { name: 'Write a review', exact: true }).click()
    await page.getByRole('radio', { name: '5 stars', exact: true }).click()
    await page.getByLabel('Title', { exact: true }).fill('Brightest lamp I own')
    await page.getByLabel('Review', { exact: true }).fill('Warm light and a sturdy base.')
    await page.getByRole('button', { name: 'Submit review', exact: true }).click()
    await section.getByText('Your review', { exact: true }).waitFor()
    await section.getByText('Waiting for approval', { exact: true }).waitFor()
    await section.getByRole('button', { name: 'Edit review', exact: true }).waitFor()
    await section.getByRole('button', { name: 'Write a review', exact: true }).waitFor({
      state: 'detached',
    })

    const saved = await ProductReview.query()
      .where('product_id', product.id)
      .where('user_id', customer.id)
      .firstOrFail()
    assert.equal(saved.rating, 5)
    assert.equal(saved.title, 'Brightest lamp I own')
    assert.equal(saved.body, 'Warm light and a sturdy base.')
    assert.equal(saved.status, 'pending')
    assert.equal(saved.orderId, order.id)

    // Staff have no delivered order of their own, so they are told when they could review.
    await browserContext.clearCookies()
    await browserContext.loginAs(staff)
    const ineligible = await visit(`/product/${product.handle}`)
    ineligible.on('pageerror', (error) => errors.push(error.message))
    await ineligible
      .locator('#reviews')
      .getByText('You can review this product once an order with it has been delivered to you.', {
        exact: true,
      })
      .waitFor()

    // Staff find the review from store navigation and approve it.
    const admin = await visit('/seller/discounts')
    admin.on('pageerror', (error) => errors.push(error.message))
    await admin.getByRole('link', { name: 'Reviews', exact: true }).first().click()
    await admin.assertPath('/seller/reviews')
    const row = admin.getByRole('row').filter({ hasText: 'Brightest lamp I own' })
    await row.getByText(product.title).first().waitFor()
    await row.getByText('maria-browser-review@example.com').first().waitFor()
    await row.getByRole('button', { name: 'Hide', exact: true }).waitFor()
    await row.getByRole('button', { name: 'Approve', exact: true }).click()
    await admin.getByText('Review approved', { exact: true }).first().waitFor()

    await saved.refresh()
    assert.equal(saved.status, 'approved')
    assert.equal(saved.moderatedById, staff.id)
    assert.isNotNull(saved.moderatedAt)

    // A guest shopper now sees the approved review with the short author name.
    await browserContext.clearCookies()
    const shopper = await visit(`/product/${product.handle}`)
    shopper.on('pageerror', (error) => errors.push(error.message))
    const reviews = shopper.locator('#reviews')
    await reviews.getByText('Brightest lamp I own', { exact: true }).waitFor()
    await reviews.getByText('Warm light and a sturdy base.', { exact: true }).waitFor()
    await reviews.getByText('Maria S.', { exact: true }).waitFor()
    await reviews.getByText('No reviews yet.', { exact: true }).waitFor({ state: 'detached' })
    assert.notInclude(await reviews.innerText(), 'maria-browser-review@example.com')

    assert.deepEqual(errors, [])
  })

  test('a customer pages through reviews and deletes their own review', async ({
    visit,
    browserContext,
    assert,
  }) => {
    const variant = await ProductVariantFactory.create()
    await variant.load('product')
    const product = variant.product
    const customer = await UserFactory.merge({ firstName: 'Ana', lastName: 'Reyes' }).create()
    const order = await OrderFactory.merge({ userId: customer.id }).create()
    await OrderLineItemFactory.merge({
      orderId: order.id,
      productVariantId: variant.id,
    }).create()
    await Shipment.create({ orderId: order.id, state: 'delivered' })
    const others = await UserFactory.createMany(11)
    for (const [index, other] of others.entries()) {
      await ProductReview.create({
        productId: product.id,
        userId: other.id,
        rating: 4,
        title: `Review ${index + 1}`,
        body: null,
        status: 'approved',
      })
    }
    const own = await ProductReview.create({
      productId: product.id,
      userId: customer.id,
      orderId: order.id,
      rating: 3,
      title: 'Changed my mind',
      body: null,
      status: 'pending',
    })
    const errors: string[] = []

    await browserContext.loginAs(customer)
    const page = await visit(`/product/${product.handle}?variantId=${variant.id}`)
    page.on('pageerror', (error) => errors.push(error.message))
    const section = page.locator('#reviews')

    // The second reviews page keeps the selected variant in the URL.
    await section.getByRole('button', { name: 'Page 2', exact: true }).click()
    await page.waitForURL((url) => url.searchParams.get('reviewsPage') === '2')
    assert.equal(new URL(page.url()).searchParams.get('variantId'), variant.id)
    const listed = section.locator('ul.divide-y > li')
    await listed.nth(1).waitFor({ state: 'detached' })
    assert.equal(await listed.count(), 1)

    // Deleting goes through the confirmation dialog.
    await section.getByRole('button', { name: 'Delete review', exact: true }).click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Delete review', exact: true })
      .click()
    await section.getByText('Your review', { exact: true }).waitFor({ state: 'detached' })
    await section.getByRole('button', { name: 'Write a review', exact: true }).waitFor()
    assert.isNull(await ProductReview.find(own.id))

    assert.deepEqual(errors, [])
  })
})

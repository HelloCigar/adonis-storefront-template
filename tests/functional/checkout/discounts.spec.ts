import { randomUUID } from 'node:crypto'
import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import CartService from '#services/checkout/cart_service'
import QuoteService from '#services/checkout/quote_service'
import CheckoutService from '#services/checkout/checkout_service'
import RecoveryService from '#services/payments/recovery_service'
import SettlementService from '#services/payments/settlement_service'
import FulfillmentService from '#services/checkout/fulfillment_service'
import InventoryService from '#services/catalog/inventory_service'
import PaymentService from '#services/payments/payment_service'
import DispatcherService from '#services/payments/dispatcher_service'
import FakePaymentAdapter from '#tests/helpers/fake_payment_adapter'
import Attempt from '#models/payments/attempt'
import Cart from '#models/checkout/cart'
import DiscountCode from '#models/checkout/discount_code'
import DiscountRedemption from '#models/checkout/discount_redemption'
import StockReservation from '#models/checkout/stock_reservation'
import { UserFactory } from '#database/factories/user_factory'
import { ProductVariantFactory } from '#database/factories/product_variant_factory'
import { urlFor } from '@adonisjs/core/services/url_builder'

const shipping = {
  firstName: 'Guest',
  lastName: 'Customer',
  phoneNumber: '09171234567',
  address1: '123 Sample Street',
  city: 'Quezon City',
  zoneCode: 'Metro Manila',
  postalCode: '1100',
  countryCode: 'PH' as const,
}

function discount(values: Partial<DiscountCode> = {}) {
  return DiscountCode.create({
    code: 'SAVE10',
    kind: 'percentage',
    percentOff: 10,
    amountOffMinor: null,
    minimumSubtotalMinor: 0,
    usageLimit: null,
    timesUsed: 0,
    oncePerCustomer: false,
    active: true,
    ...values,
  })
}

async function sellable(priceAmount: number, inventoryQuantity = 10) {
  const variant = await ProductVariantFactory.merge({
    priceAmount,
    currencyCode: 'PHP',
    availableForSale: true,
    inventoryQuantity,
  }).create()
  await variant.load('product')
  variant.product.status = 'active'
  variant.product.publishedAt = DateTime.utc()
  await variant.product.save()
  return variant
}

/** A cart with the given lines and code, quoted and ready to submit. */
async function cartWith(lines: [variantId: string, quantity: number][], code?: string) {
  const token = randomUUID()
  const carts = await app.container.make(CartService)
  for (const [variantId, quantity] of lines) await carts.add(token, undefined, variantId, quantity)
  if (code) await carts.applyDiscount(token, undefined, code)
  return { token, ...(await quoted(token)) }
}

async function quoted(token: string, email = 'guest@example.com') {
  const carts = await app.container.make(CartService)
  const quotes = await app.container.make(QuoteService)
  const quote = await quotes.quote((await carts.load(token))!)
  const input = {
    email,
    shipping,
    submissionKey: quote.submissionKey,
    cartVersion: quote.cartVersion,
    quoteFingerprint: quote.fingerprint,
  }
  return { quote, input }
}

async function submit(token: string, input: Awaited<ReturnType<typeof quoted>>['input']) {
  const checkout = await app.container.make(CheckoutService)
  return checkout.submit(token, undefined, input)
}

async function savedCode(token: string) {
  const cart = await Cart.findByOrFail('token', token)
  return cart.discountCode
}

test.group('Discount codes at checkout', (group) => {
  let adapter: FakePaymentAdapter
  group.each.setup(async () => {
    const cleanup = await testUtils.db().truncate()
    adapter = new FakePaymentAdapter()
    app.container.swap(PaymentService, () => new DispatcherService(adapter.provider, [adapter]))
    return async () => {
      app.container.restore(PaymentService)
      const inventory = await app.container.make(InventoryService)
      const reserved = await StockReservation.query().where('state', 'reserved')
      for (const orderId of new Set(reserved.map((row) => row.orderId)))
        await db.transaction((trx) => inventory.release(trx, orderId))
      await cleanup()
    }
  })

  test('freezes a percentage discount on the order, its lines and the provider request', async ({
    assert,
  }) => {
    const shirt = await sellable(499)
    const mug = await sellable(150)
    await discount({ code: 'SAVE10', percentOff: 10 })
    const { token, quote, input } = await cartWith(
      [
        [shirt.id, 3],
        [mug.id, 1],
      ],
      ' save10 '
    )
    // 3 × 499 + 150 = 1,647.00; 10% rounds half up to 164.70.
    assert.equal(quote.subtotalMinor, 164_700)
    assert.deepEqual(quote.discount, { code: 'SAVE10', kind: 'percentage', amountMinor: 16_470 })
    assert.equal(quote.totalMinor, 164_700 - 16_470 + 10_000)
    assert.deepEqual(
      quote.lines.map((line) => line.discountAmount),
      [14_970, 1_500]
    )

    const { order } = await submit(token, input)
    await order.load('lineItems')
    assert.equal(order.discountMinor, 16_470)
    assert.equal(order.discountCode, 'SAVE10')
    assert.equal(order.totalMinor, 158_230)
    assert.deepEqual(
      order.lineItems.map((line) => [line.totalMinor, line.discountMinor]),
      [
        [149_700, 14_970],
        [15_000, 1_500],
      ]
    )
    const attempt = await Attempt.findByOrFail('orderId', order.id)
    const items = attempt.requestSnapshot.items
    assert.equal(
      items.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0),
      order.totalMinor
    )
    // 149,700 − 14,970 = 134,730 splits evenly across 3 units; the mug is one unit anyway.
    assert.deepInclude(items[0], { unitAmount: 44_910, quantity: 3 })
    assert.deepInclude(items[1], { unitAmount: 13_500, quantity: 1 })
    assert.deepInclude(items[2], { name: 'Shipping', unitAmount: 10_000, quantity: 1 })

    const code = await DiscountCode.findByOrFail('code', 'SAVE10')
    assert.equal(code.timesUsed, 1)
    const redemption = await DiscountRedemption.findByOrFail('orderId', order.id)
    assert.equal(redemption.amountMinor, 16_470)
    assert.isNull(redemption.customerKey)
  })

  test('sends unevenly discounted lines as one line and leaves out fully discounted ones', async ({
    assert,
  }) => {
    const shirt = await sellable(100)
    await discount({ code: 'PESO', kind: 'fixed', percentOff: null, amountOffMinor: 100 })
    const uneven = await cartWith([[shirt.id, 3]], 'peso')
    // 300.00 − 1.00 leaves 299.00, which does not divide across 3 units.
    const first = await submit(uneven.token, uneven.input)
    const attempt = await Attempt.findByOrFail('orderId', first.order.id)
    assert.deepInclude(attempt.requestSnapshot.items[0], { unitAmount: 29_900, quantity: 1 })
    assert.match(attempt.requestSnapshot.items[0].name, /× 3$/)

    await discount({ code: 'FREEBIE', kind: 'fixed', percentOff: null, amountOffMinor: 1_000_000 })
    const free = await cartWith([[shirt.id, 2]], 'FREEBIE')
    assert.equal(free.quote.discount?.amountMinor, 20_000)
    assert.equal(free.quote.totalMinor, 10_000)
    const second = await submit(free.token, free.input)
    const freeAttempt = await Attempt.findByOrFail('orderId', second.order.id)
    assert.deepEqual(
      freeAttempt.requestSnapshot.items.map((item) => item.name),
      ['Shipping']
    )
  })

  test('rejects codes that are unknown, off, scheduled, expired, used up or under the minimum', async ({
    assert,
  }) => {
    const shirt = await sellable(499)
    const now = DateTime.utc()
    await discount({ code: 'OFF', active: false })
    await discount({ code: 'LATER', startsAt: now.plus({ days: 1 }) })
    await discount({ code: 'OVER', endsAt: now.minus({ minutes: 1 }) })
    await discount({ code: 'GONE', usageLimit: 2, timesUsed: 2 })
    await discount({ code: 'BIGSPEND', minimumSubtotalMinor: 100_000 })
    const token = randomUUID()
    const carts = await app.container.make(CartService)
    await carts.add(token, undefined, shirt.id, 1)
    const cases: [string, string][] = [
      ['NOPE', 'This code isn’t valid.'],
      ['OFF', 'This code isn’t valid.'],
      ['LATER', 'This code isn’t active yet.'],
      ['OVER', 'This code has expired.'],
      ['GONE', 'This code has reached its usage limit.'],
      ['BIGSPEND', 'Spend at least ₱1,000.00 to use this code.'],
    ]
    for (const [code, message] of cases) {
      try {
        await carts.applyDiscount(token, undefined, code)
        assert.fail(`${code} should be rejected`)
      } catch (error) {
        assert.deepEqual((error as { messages: unknown }).messages, [
          { field: 'code', rule: 'discount', message },
        ])
      }
    }
    const cart = await Cart.findByOrFail('token', token)
    assert.isNull(cart.discountCode)
  })

  test('a code that stops applying is reported on the quote and never charged', async ({
    assert,
  }) => {
    const shirt = await sellable(499)
    const code = await discount({ code: 'SAVE10' })
    const { token, input } = await cartWith([[shirt.id, 1]], 'SAVE10')
    code.active = false
    await code.save()
    const { quote } = await quoted(token)
    assert.isNull(quote.discount)
    assert.equal(quote.discountMinor, 0)
    assert.equal(quote.discountError, 'This code isn’t valid.')
    await assert.rejects(
      () => submit(token, input),
      'Prices or availability changed. Review the updated quote.'
    )
    const fresh = await quoted(token)
    const { order } = await submit(token, fresh.input)
    assert.equal(order.discountMinor, 0)
    assert.isNull(order.discountCode)
    await code.refresh()
    assert.equal(code.timesUsed, 0)
  })

  test('the usage limit holds across carts quoted before the last use', async ({ assert }) => {
    const shirt = await sellable(499)
    const code = await discount({ code: 'ONCE', usageLimit: 1 })
    const first = await cartWith([[shirt.id, 1]], 'ONCE')
    const second = await cartWith([[shirt.id, 1]], 'ONCE')
    assert.equal(second.quote.discount?.code, 'ONCE')
    await submit(first.token, first.input)
    await assert.rejects(() => submit(second.token, second.input))
    await code.refresh()
    assert.equal(code.timesUsed, 1)
    assert.lengthOf(await DiscountRedemption.all(), 1)
    await assert.rejects(
      () => DiscountCode.query().where('id', code.id).update({ timesUsed: -1 }),
      /CHECK constraint failed/
    )
  })

  test('once-per-customer codes allow one active use per email until the order closes unpaid', async ({
    assert,
  }) => {
    const shirt = await sellable(499)
    const code = await discount({ code: 'WELCOME', oncePerCustomer: true })
    const first = await cartWith([[shirt.id, 1]], 'WELCOME')
    const { order } = await submit(first.token, { ...first.input, email: 'Repeat@Example.com' })

    const again = await cartWith([[shirt.id, 1]], 'WELCOME')
    await assert.rejects(
      () => submit(again.token, { ...again.input, email: 'repeat@example.com' }),
      'This discount code was already used with this email address.'
    )
    const other = await submit(again.token, { ...again.input, email: 'someone@example.com' })
    assert.equal(other.order.discountCode, 'WELCOME')
    await code.refresh()
    assert.equal(code.timesUsed, 2)

    // The first order's payment window closes unpaid, which returns its use of the code.
    const attempt = await Attempt.findByOrFail('orderId', order.id)
    const recovery = await app.container.make(RecoveryService)
    await recovery.run(attempt.id)
    await attempt.refresh()
    attempt.expiresAtMs = Date.now() - 1
    await attempt.save()
    await recovery.run(attempt.id, true)
    await recovery.run(attempt.id, true)
    await order.refresh()
    assert.equal(order.lifecycleState, 'expired')
    await code.refresh()
    assert.equal(code.timesUsed, 1)
    const released = await DiscountRedemption.findByOrFail('orderId', order.id)
    assert.isNotNull(released.releasedAt)
    assert.isNull(released.customerKey)

    const retry = await cartWith([[shirt.id, 1]], 'WELCOME')
    const reused = await submit(retry.token, { ...retry.input, email: 'repeat@example.com' })
    assert.equal(reused.order.discountCode, 'WELCOME')
  })

  test('staff cancelling a paid order returns its use of the code once', async ({ assert }) => {
    const shirt = await sellable(499)
    const code = await discount({ code: 'SAVE10' })
    const { token, input } = await cartWith([[shirt.id, 2]], 'SAVE10')
    const { order } = await submit(token, input)
    const attempt = await Attempt.findByOrFail('orderId', order.id)
    const recovery = await app.container.make(RecoveryService)
    await recovery.run(attempt.id)
    await attempt.refresh()
    const session = adapter.sessions.get(attempt.externalId!)!
    session.status = 'paid'
    session.payments = [
      { id: 'captured', amount: order.totalMinor, currency: 'PHP', status: 'paid' },
    ]
    const settlement = await app.container.make(SettlementService)
    await settlement.apply(session)
    await order.refresh()
    assert.equal(order.lifecycleState, 'confirmed')
    await code.refresh()
    assert.equal(code.timesUsed, 1)

    const staff = await UserFactory.merge({ role: 'staff' }).create()
    const fulfillment = await app.container.make(FulfillmentService)
    await fulfillment.cancel(order.id, staff)
    await fulfillment.cancel(order.id, staff)
    await code.refresh()
    assert.equal(code.timesUsed, 0)
  })

  test('shoppers apply and remove a code over HTTP', async ({ assert, client, route }) => {
    const shirt = await sellable(499)
    await discount({ code: 'SAVE10' })
    const token = randomUUID()
    const carts = await app.container.make(CartService)
    await carts.add(token, undefined, shirt.id, 1)

    const rejected = await client
      .post(urlFor('checkout.discount.store'))
      .withSession({ store_cart_token: token })
      .withCsrfToken()
      .header('referer', route('checkout.create'))
      .form({ code: 'NOPE' })
      .redirects(0)
    rejected.assertStatus(302)
    assert.isNull(await savedCode(token))

    const applied = await client
      .post(urlFor('checkout.discount.store'))
      .withSession({ store_cart_token: token })
      .withCsrfToken()
      .form({ code: 'save10' })
      .redirects(0)
    applied.assertStatus(302)
    applied.assertHeader('location', route('checkout.create'))
    assert.equal(await savedCode(token), 'SAVE10')

    const page = await client
      .get(route('checkout.create'))
      .withSession({ store_cart_token: token })
      .withInertia()
    page.assertInertiaComponent('checkout/index')
    assert.deepEqual(page.inertiaProps.quote.discount, {
      code: 'SAVE10',
      kind: 'percentage',
      amountMinor: 4_990,
    })
    assert.equal(page.inertiaProps.quote.totalMinor, 49_900 - 4_990 + 10_000)

    const removed = await client
      .delete(urlFor('checkout.discount.destroy'))
      .withSession({ store_cart_token: token })
      .withCsrfToken()
      .redirects(0)
    removed.assertStatus(302)
    assert.isNull(await savedCode(token))
  })
})

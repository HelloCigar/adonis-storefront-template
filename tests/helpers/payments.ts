import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import type { ApiClient } from '@japa/api-client'
import { getActiveTestOrFail, timeTravel } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import CartService from '#services/checkout/cart_service'
import QuoteService from '#services/checkout/quote_service'
import CheckoutService from '#services/checkout/checkout_service'
import InventoryService from '#services/catalog/inventory_service'
import PaymentService from '#services/payments/payment_service'
import DispatcherService from '#services/payments/dispatcher_service'
import type User from '#models/account/user'
import Attempt from '#models/payments/attempt'
import Order from '#models/checkout/order'
import StockReservation from '#models/checkout/stock_reservation'
import FakePaymentAdapter from '#tests/helpers/fake_payment_adapter'
import type { FakeWebhookEvent } from '#tests/helpers/types'
import PublishWorkflowOutbox from '#jobs/checkout/publish_workflow_outbox'
import SweepPaymentOperations from '#jobs/payments/sweep_payment_operations'
import { runQueue } from '#tests/helpers/queue'
import { ProductVariantFactory } from '#database/factories/product_variant_factory'
import { urlFor } from '@adonisjs/core/services/url_builder'

/** Two units at PHP 499 plus PHP 100 shipping. */
export const orderTotalMinor = 109_800

/**
 * Empties the database before each test and, after it, releases stock still held by
 * unpaid orders, since held variants cannot be deleted.
 */
export async function resetCheckoutState() {
  const truncate = await testUtils.db().truncate()
  return async () => {
    const inventory = await app.container.make(InventoryService)
    const held = await StockReservation.query().where('state', 'reserved')
    for (const orderId of new Set(held.map((row) => row.orderId)))
      await db.transaction((trx) => inventory.release(trx, orderId))
    await truncate()
  }
}

/** The store takes payments through the in-memory provider for the active test. */
export function useFakeProvider(adapters: FakePaymentAdapter[] = [new FakePaymentAdapter()]) {
  app.container.swap(PaymentService, () => new DispatcherService(adapters[0].provider, adapters))
  getActiveTestOrFail().cleanup(() => app.container.restore(PaymentService))
  return adapters[0]
}

export const shippingAddress = {
  firstName: 'Guest',
  lastName: 'Customer',
  phoneNumber: '09171234567',
  address1: '123 Sample Street',
  city: 'Quezon City',
  zoneCode: 'Metro Manila',
  postalCode: '1100',
  countryCode: 'PH' as const,
}

/**
 * A cart holding two in-stock units at PHP 499, with the checkout form the shopper would
 * submit for it. Belongs to a guest unless a customer account is given.
 */
export async function cartReady(options: { customer?: User; discountCode?: string } = {}) {
  const { customer, discountCode } = options
  const variant = await ProductVariantFactory.merge({
    priceAmount: 499,
    currencyCode: 'PHP',
    availableForSale: true,
    inventoryQuantity: 2,
  }).create()
  await variant.load('product')
  variant.product.status = 'active'
  variant.product.publishedAt = DateTime.utc()
  await variant.product.save()
  const token = randomUUID()
  const carts = await app.container.make(CartService)
  await carts.add(token, customer?.id, variant.id, 2)
  if (discountCode) await carts.applyDiscount(token, customer?.id, discountCode)
  const cart = await carts.load(token)
  const quotes = await app.container.make(QuoteService)
  const quote = await quotes.quote(cart!)
  const input = {
    email: customer?.email ?? 'guest@example.com',
    shipping: shippingAddress,
    submissionKey: quote.submissionKey,
    cartVersion: quote.cartVersion,
    quoteFingerprint: quote.fingerprint,
  }
  return { variant, token, input }
}

/** Submits the checkout form from a browser session holding the cart. */
export function submitCheckout(
  client: ApiClient,
  token: string,
  input: Awaited<ReturnType<typeof cartReady>>['input']
) {
  return client
    .post(urlFor('checkout.store'))
    .withSession({ store_cart_token: token })
    .withCsrfToken()
    .form(input)
    .redirects(0)
}

/**
 * A guest placed an order through the checkout form, paying through the in-memory provider.
 * Returns the order and the guest's browser session after checkout.
 */
export async function placedByGuest(client: ApiClient) {
  useFakeProvider()
  const { token, input } = await cartReady()
  const response = await submitCheckout(client, token, input)
  const order = await Order.firstOrFail()
  return { order, response, cartToken: token, guestSession: response.session() }
}

/**
 * A submitted checkout for two units, which are now held for the unpaid order. Placed by a
 * guest unless a customer account is given.
 */
export async function awaitingPayment(options: { customer?: User; discountCode?: string } = {}) {
  const { customer } = options
  const { variant, token, input } = await cartReady(options)
  const checkout = await app.container.make(CheckoutService)
  const { order } = await checkout.submit(token, customer?.id, input)
  const attempt = await Attempt.findByOrFail('orderId', order.id)
  return { order, attempt, variant }
}

/** An unpaid order whose hosted checkout page the provider has opened. */
export async function checkoutOpened(options: { customer?: User; discountCode?: string } = {}) {
  const situation = await awaitingPayment(options)
  await runQueue(['payments'])
  await situation.attempt.refresh()
  return situation
}

/** A paid, confirmed order whose provider capture the store accepted. */
export async function paidOrder(
  client: ApiClient,
  adapter: FakePaymentAdapter,
  options: { customer?: User } = {}
) {
  const situation = await checkoutOpened(options)
  const checkoutId = situation.attempt.externalId!
  adapter.capture(checkoutId, { id: 'pay_accepted', amount: orderTotalMinor })
  const response = await sendWebhook(client, adapter, {
    id: 'evt_paid',
    type: 'checkout.paid',
    checkoutId,
  })
  response.assertStatus(200)
  await situation.order.refresh()
  return { ...situation, checkoutId }
}

/** Posts a signed provider webhook, as the provider does. */
export function sendWebhook(
  client: ApiClient,
  adapter: FakePaymentAdapter,
  event: FakeWebhookEvent
) {
  const { rawBody, headers } = adapter.webhook(event)
  return client
    .post(urlFor('payments.webhooks.store', { provider: adapter.provider }))
    .header('content-type', 'application/json')
    .headers(headers)
    .unsafeJson(rawBody)
}

/** The scheduled payment recovery sweep runs once, through the maintenance queue. */
export async function runSweep() {
  await SweepPaymentOperations.dispatch({}).run()
  await runQueue(['maintenance'])
}

/** The scheduled outbox relay runs once, through the maintenance queue. */
export async function runOutboxRelay() {
  await PublishWorkflowOutbox.dispatch({}).run()
  await runQueue(['maintenance'])
}

/** Moves the clock past every sweep's one-minute staleness threshold. */
export function waitUntilStale() {
  timeTravel(new Date(Date.now() + 5 * 60_000))
}

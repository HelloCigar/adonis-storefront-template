import { randomUUID } from 'node:crypto'
import app from '@adonisjs/core/services/app'
import { DateTime } from 'luxon'
import CartService from '#services/checkout/cart_service'
import QuoteService from '#services/checkout/quote_service'
import CheckoutService from '#services/checkout/checkout_service'
import Cart from '#models/checkout/cart'
import DiscountCode from '#models/checkout/discount_code'
import { ProductVariantFactory } from '#database/factories/product_variant_factory'

export const shipping = {
  firstName: 'Guest',
  lastName: 'Customer',
  phoneNumber: '09171234567',
  address1: '123 Sample Street',
  city: 'Quezon City',
  zoneCode: 'Metro Manila',
  postalCode: '1100',
  countryCode: 'PH' as const,
}

export function discount(values: Partial<DiscountCode> = {}) {
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

export async function sellable(priceAmount: number, inventoryQuantity = 10) {
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
export async function cartWith(lines: [variantId: string, quantity: number][], code?: string) {
  const token = randomUUID()
  const carts = await app.container.make(CartService)
  for (const [variantId, quantity] of lines) await carts.add(token, undefined, variantId, quantity)
  if (code) await carts.applyDiscount(token, undefined, code)
  return { token, ...(await quoted(token)) }
}

export async function quoted(token: string, email = 'guest@example.com') {
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

export async function submit(token: string, input: Awaited<ReturnType<typeof quoted>>['input']) {
  const checkout = await app.container.make(CheckoutService)
  return checkout.submit(token, undefined, input)
}

export async function savedCode(token: string) {
  const cart = await Cart.findByOrFail('token', token)
  return cart.discountCode
}

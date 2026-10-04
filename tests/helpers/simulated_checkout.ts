import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import CartService from '#services/checkout/cart_service'
import QuoteService from '#services/checkout/quote_service'
import CheckoutService from '#services/checkout/checkout_service'
import RecoveryService from '#services/payments/recovery_service'
import Attempt from '#models/payments/attempt'
import { ProductVariantFactory } from '../../database/factories/product_variant_factory.js'

export async function simulatedCheckout() {
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
  await carts.add(token, undefined, variant.id, 1)
  const cart = (await carts.load(token))!
  const quotes = await app.container.make(QuoteService)
  const quote = await quotes.quote(cart)
  const service = await app.container.make(CheckoutService)
  const result = await service.submit(token, undefined, {
    email: 'simulation@example.com',
    shipping: {
      firstName: 'Dev',
      lastName: 'Customer',
      phoneNumber: '09171234567',
      address1: '123 Sample Street',
      city: 'Quezon City',
      zoneCode: 'Metro Manila',
      postalCode: '1100',
      countryCode: 'PH',
    },
    submissionKey: quote.submissionKey,
    cartVersion: quote.cartVersion,
    quoteFingerprint: quote.fingerprint,
  })
  const attempt = await Attempt.findByOrFail('orderId', result.order.id)
  const recovery = await app.container.make(RecoveryService)
  await recovery.run(attempt.id)
  await attempt.refresh()
  return { order: result.order, grant: result.token, attempt, variant, cartToken: token }
}

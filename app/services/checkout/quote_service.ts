import { createHash } from 'node:crypto'
import { inject } from '@adonisjs/core'
import Cart from '#models/checkout/cart'
import MoneyService from '#services/checkout/money_service'
import checkout from '#config/checkout'
import CheckoutException from '#exceptions/checkout_exception'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

@inject()
export default class QuoteService {
  constructor(private money: MoneyService) {}

  async quote(cart: Cart, trx?: TransactionClientContract) {
    if (cart.status !== 'active' || (cart.expiresAt && cart.expiresAt.toMillis() <= Date.now())) {
      throw new CheckoutException('Your cart has expired. Start a new cart.', 'E_CART_EXPIRED')
    }
    if (trx) cart.useTransaction(trx)
    await cart.load('lines', (query) =>
      query.orderBy('id').preload('variant', (q) => q.preload('product'))
    )
    if (!cart.lines.length) throw new CheckoutException('Your cart is empty', 'E_CART_EMPTY', 422)
    const lines = cart.lines.map((line) => {
      const variant = line.variant
      const product = variant?.product
      if (
        !product ||
        product.status !== 'active' ||
        !product.publishedAt ||
        !variant.isSellable ||
        (variant.quantityAvailable !== null && line.quantity > variant.quantityAvailable)
      ) {
        throw new CheckoutException(
          'An item is no longer available. Update your cart.',
          'E_STOCK_UNAVAILABLE'
        )
      }
      if (variant.currencyCode !== checkout.currency || cart.currencyCode !== checkout.currency) {
        throw new CheckoutException('Checkout only supports PHP', 'E_CHECKOUT_CURRENCY', 422)
      }
      const unitAmount = this.money.toMinor(variant.priceAmount)
      return {
        variantId: variant.id,
        productId: product.id,
        title: product.title,
        variantTitle: variant.title,
        sku: variant.sku,
        options: variant.options,
        quantity: line.quantity,
        unitAmount,
        totalAmount: this.money.multiply(unitAmount, line.quantity),
      }
    })
    const subtotalMinor = lines.reduce((total, line) => this.money.add(total, line.totalAmount), 0)
    const totalMinor = this.money.add(subtotalMinor, checkout.flatShippingAmountMinor)
    const value = {
      cartVersion: cart.version,
      currency: checkout.currency,
      lines,
      subtotalMinor,
      shippingMinor: checkout.flatShippingAmountMinor,
      totalMinor,
    }
    const fingerprint = createHash('sha256').update(JSON.stringify(value)).digest('hex')
    return { ...value, fingerprint, submissionKey: cart.submissionKey! }
  }
}

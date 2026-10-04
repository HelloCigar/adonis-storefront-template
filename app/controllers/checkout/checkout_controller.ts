import { randomUUID } from 'node:crypto'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { errors } from '@vinejs/vine'
import CartService from '#services/checkout/cart_service'
import QuoteService from '#services/checkout/quote_service'
import CheckoutService from '#services/checkout/checkout_service'
import { checkoutValidator } from '#validators/checkout/checkout'
import CheckoutException from '#exceptions/checkout_exception'
import PaymentException from '#exceptions/payment_exception'
import QuoteTransformer from '#transformers/checkout/quote_transformer'

@inject()
export default class CheckoutController {
  constructor(
    private carts: CartService,
    private quotes: QuoteService,
    private checkout: CheckoutService
  ) {}

  async create({ session, auth, inertia }: HttpContext) {
    let token = session.get('store_cart_token') as string | undefined
    if (!token) {
      token = randomUUID()
      session.put('store_cart_token', token)
    }
    const cart = await this.carts.findOrCreate(token, auth.user?.id)
    let quote: Awaited<ReturnType<QuoteService['quote']>> | null = null
    let error: string | null = null
    try {
      quote = await this.quotes.quote(cart)
    } catch (cause) {
      if (!(cause instanceof CheckoutException)) throw cause
      error = cause.message
    }
    return inertia.render('checkout/index', {
      quote: quote ? QuoteTransformer.transform(quote) : null,
      checkoutError: error,
    })
  }

  async store({ request, auth, response, session }: HttpContext) {
    const input = await request.validateUsing(checkoutValidator)
    const previous = (session.get('store_checkout_submissions') ?? {}) as Record<string, string>
    const token =
      previous[input.submissionKey] ?? (session.get('store_cart_token') as string | undefined)
    if (!token) throw new CheckoutException('Cart not found', 'E_CART_NOT_FOUND', 404)
    try {
      const result = await this.checkout.submit(token, auth.user?.id, input)
      const grants = (session.get('store_order_grants') ?? {}) as Record<string, string>
      grants[result.order.publicId!] = result.token
      session.put('store_order_grants', Object.fromEntries(Object.entries(grants).slice(-20)))
      previous[input.submissionKey] = token
      session.put(
        'store_checkout_submissions',
        Object.fromEntries(Object.entries(previous).slice(-20))
      )
      session.put('store_cart_token', randomUUID())
      return response
        .redirect()
        .toRoute('checkout.orders.show', { publicId: result.order.publicId! })
    } catch (error) {
      if (!(error instanceof CheckoutException || error instanceof PaymentException)) throw error
      throw new errors.E_VALIDATION_ERROR([
        { field: 'quoteFingerprint', rule: error.code, message: error.message },
      ])
    }
  }
}

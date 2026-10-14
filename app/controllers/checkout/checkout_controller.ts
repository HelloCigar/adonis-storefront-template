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
import CustomerAddressTransformer from '#transformers/account/customer_address_transformer'

@inject()
export default class CheckoutController {
  constructor(
    private carts: CartService,
    private quotes: QuoteService,
    private checkout: CheckoutService
  ) {}

  async create({ checkoutSession, auth, inertia }: HttpContext) {
    const cart = await this.carts.findOrCreate(checkoutSession.ensureCartToken(), auth.user?.id)
    let quote: Awaited<ReturnType<QuoteService['quote']>> | null = null
    let error: string | null = null
    try {
      quote = await this.quotes.quote(cart)
    } catch (cause) {
      if (!(cause instanceof CheckoutException)) throw cause
      error = cause.message
    }
    // Signed-in customers pick from their saved addresses, default first.
    const addresses = auth.user
      ? await auth.user.related('addresses').query().orderBy('created_at', 'asc')
      : []
    const defaultAddressId = auth.user?.defaultAddressId ?? null
    addresses.sort((a, b) => Number(b.id === defaultAddressId) - Number(a.id === defaultAddressId))
    return inertia.render('checkout/index', {
      quote: quote ? QuoteTransformer.transform(quote) : null,
      checkoutError: error,
      savedAddresses: CustomerAddressTransformer.transform(addresses),
      defaultAddressId,
    })
  }

  async store({ request, auth, response, checkoutSession }: HttpContext) {
    const input = await request.validateUsing(checkoutValidator)
    const token = checkoutSession.submissionCart(input.submissionKey) ?? checkoutSession.cartToken()
    if (!token) throw new CheckoutException('Cart not found', 'E_CART_NOT_FOUND', 404)
    try {
      const result = await this.checkout.submit(token, auth.user?.id, input)
      checkoutSession.rememberOrderGrant(result.order.publicId!, result.token)
      checkoutSession.rememberSubmission(input.submissionKey, token)
      checkoutSession.rotateCartToken()
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

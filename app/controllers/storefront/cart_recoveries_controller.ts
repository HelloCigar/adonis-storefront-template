import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Cart from '#models/checkout/cart'

export default class CartRecoveriesController {
  /** Opens the cart from a reminder email in this browser; the signature covers the cart id. */
  async show({ request, params, response, session, checkoutSession }: HttpContext) {
    if (!request.hasValidSignature()) {
      session.flash('error', 'This cart link has expired.')
      return response.redirect().withQs(false).toRoute('home')
    }
    const cart = await Cart.query().where('id', params.id).where('status', 'active').first()
    if (!cart || (cart.expiresAt && cart.expiresAt <= DateTime.utc())) {
      session.flash('error', 'This cart is no longer available.')
      return response.redirect().withQs(false).toRoute('home')
    }
    checkoutSession.restoreCartToken(cart.token)
    return response
      .redirect()
      .withQs(false)
      .toRoute('home', [], { qs: { cart: 'open' } })
  }
}

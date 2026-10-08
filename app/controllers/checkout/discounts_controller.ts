import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import CartService from '#services/checkout/cart_service'
import { discountCodeValidator } from '#validators/checkout/cart'

/** The discount code saved on the shopper's active cart. */
@inject()
export default class DiscountsController {
  constructor(private carts: CartService) {}

  async store({ request, response, auth, checkoutSession }: HttpContext) {
    const { code } = await request.validateUsing(discountCodeValidator)
    await this.carts.applyDiscount(checkoutSession.ensureCartToken(), auth.user?.id, code)
    return response.redirect().toRoute('checkout.create')
  }

  async destroy({ response, auth, checkoutSession }: HttpContext) {
    await this.carts.applyDiscount(checkoutSession.ensureCartToken(), auth.user?.id, null)
    return response.redirect().toRoute('checkout.create')
  }
}

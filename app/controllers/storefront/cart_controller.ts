import { inject } from '@adonisjs/core'
import CartService from '#services/checkout/cart_service'
import { cartAddValidator, cartUpdateValidator } from '#validators/checkout/cart'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class CartController {
  constructor(private cartService: CartService) {}

  async store(ctx: HttpContext) {
    const { variantId, quantity } = await ctx.request.validateUsing(cartAddValidator)
    await this.cartService.add(
      ctx.checkoutSession.ensureCartToken(),
      ctx.auth.user?.id,
      variantId,
      quantity
    )
    return ctx.response.redirect().back()
  }

  async update(ctx: HttpContext) {
    const { quantity } = await ctx.request.validateUsing(cartUpdateValidator)
    await this.cartService.update(
      ctx.checkoutSession.ensureCartToken(),
      ctx.auth.user?.id,
      ctx.params.id,
      quantity
    )
    return ctx.response.redirect().back()
  }

  async destroy(ctx: HttpContext) {
    await this.cartService.remove(
      ctx.checkoutSession.ensureCartToken(),
      ctx.auth.user?.id,
      ctx.params.id
    )
    return ctx.response.redirect().back()
  }
}

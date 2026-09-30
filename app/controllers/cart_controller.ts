import { randomUUID } from 'node:crypto'
import { inject } from '@adonisjs/core'
import CartService from '#services/cart_service'
import { cartAddValidator, cartUpdateValidator } from '#validators/storefront'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class CartController {
  constructor(private cartService: CartService) {}

  private getToken({ session }: HttpContext) {
    let token = session.get('store_cart_token') as string | undefined
    if (!token) {
      token = randomUUID()
      session.put('store_cart_token', token)
    }
    return token
  }

  async store(ctx: HttpContext) {
    const { variantId, quantity } = await ctx.request.validateUsing(cartAddValidator)
    await this.cartService.add(this.getToken(ctx), ctx.auth.user?.id, variantId, quantity)
    return ctx.response.redirect().back()
  }

  async update(ctx: HttpContext) {
    const { quantity } = await ctx.request.validateUsing(cartUpdateValidator)
    await this.cartService.update(this.getToken(ctx), ctx.auth.user?.id, ctx.params.id, quantity)
    return ctx.response.redirect().back()
  }

  async destroy(ctx: HttpContext) {
    await this.cartService.remove(this.getToken(ctx), ctx.auth.user?.id, ctx.params.id)
    return ctx.response.redirect().back()
  }
}

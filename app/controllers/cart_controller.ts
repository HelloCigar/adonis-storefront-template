import { randomUUID } from 'node:crypto'
import Cart from '#models/cart'
import ProductVariant from '#models/product_variant'
import { cartAddValidator, cartUpdateValidator } from '#validators/storefront'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { errors } from '@vinejs/vine'

function invalidCart(message: string): never {
  throw new errors.E_VALIDATION_ERROR([{ field: 'cart', rule: 'available', message }])
}

export default class CartController {
  private async getCart({ session, auth }: HttpContext) {
    let token = session.get('store_cart_token') as string | undefined
    if (!token) {
      token = randomUUID()
      session.put('store_cart_token', token)
    }
    return Cart.firstOrCreate(
      { token, status: 'active' },
      {
        currencyCode: 'PHP',
        userId: auth.user?.id,
        expiresAt: DateTime.utc().plus({ days: 10 }),
      }
    )
  }

  async add(ctx: HttpContext) {
    const { variantId, quantity } = await ctx.request.validateUsing(cartAddValidator)
    const variant = await ProductVariant.query()
      .where('id', variantId)
      .whereHas('product', (query) => query.where('status', 'active').whereNotNull('published_at'))
      .firstOrFail()
    if (!variant.availableForSale) invalidCart('This variant is unavailable.')
    const cart = await this.getCart(ctx)
    await db.transaction(async (trx) => {
      cart.useTransaction(trx)
      await Cart.query({ client: trx }).where('id', cart.id).forUpdate().firstOrFail()
      const line = await cart
        .related('lines')
        .query()
        .where('product_variant_id', variant.id)
        .first()
      const nextQuantity = (line?.quantity ?? 0) + quantity
      if (
        nextQuantity > 10 ||
        (variant.inventoryQuantity !== null &&
          variant.inventoryQuantity >= 0 &&
          nextQuantity > variant.inventoryQuantity)
      ) {
        invalidCart('The requested quantity is not available.')
      }
      const otherCurrency = await cart
        .related('lines')
        .query()
        .whereNot('currency_code', variant.currencyCode)
        .first()
      if (otherCurrency) invalidCart('A cart cannot mix currencies.')
      cart.currencyCode = variant.currencyCode
      await cart.save()
      if (line) {
        line.quantity = nextQuantity
        line.unitPriceAmount = variant.priceAmount
        await line.save()
      } else
        await cart.related('lines').create({
          productVariantId: variant.id,
          quantity,
          unitPriceAmount: variant.priceAmount,
          currencyCode: variant.currencyCode,
        })
    })
    return ctx.response.redirect().back()
  }

  async update(ctx: HttpContext) {
    const { quantity } = await ctx.request.validateUsing(cartUpdateValidator)
    const cart = await this.getCart(ctx)
    const line = await cart
      .related('lines')
      .query()
      .where('id', ctx.params.id)
      .preload('variant', (query) => query.preload('product'))
      .firstOrFail()
    const variant = line.variant
    if (
      !variant.availableForSale ||
      variant.product.status !== 'active' ||
      !variant.product.publishedAt ||
      (variant.inventoryQuantity !== null &&
        variant.inventoryQuantity >= 0 &&
        quantity > variant.inventoryQuantity)
    ) {
      invalidCart('The requested quantity is not available.')
    }
    line.quantity = quantity
    line.unitPriceAmount = variant.priceAmount
    await line.save()
    return ctx.response.redirect().back()
  }

  async remove(ctx: HttpContext) {
    const cart = await this.getCart(ctx)
    const line = await cart.related('lines').query().where('id', ctx.params.id).firstOrFail()
    await line.delete()
    return ctx.response.redirect().back()
  }
}

import Cart from '#models/checkout/cart'
import ProductVariant from '#models/catalog/product_variant'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { errors } from '@vinejs/vine'

function invalidCart(message: string): never {
  throw new errors.E_VALIDATION_ERROR([{ field: 'cart', rule: 'available', message }])
}

export default class CartService {
  findOrCreate(token: string, userId?: number) {
    return Cart.firstOrCreate(
      { token, status: 'active' },
      { currencyCode: 'PHP', userId, expiresAt: DateTime.utc().plus({ days: 10 }) }
    )
  }

  async load(token?: string) {
    if (!token) return null
    const cart = await Cart.query().where({ token, status: 'active' }).first()
    if (!cart) return null
    await cart.load('lines', (query) =>
      query
        .orderBy('id')
        .preload('variant', (variant) =>
          variant
            .preload('product')
            .preload('featuredMedia', (media) => media.preload('attachment'))
        )
    )
    return cart
  }

  async add(token: string, userId: number | undefined, variantId: number, quantity: number) {
    const variant = await ProductVariant.query()
      .where('id', variantId)
      .whereHas('product', (query) => query.where('status', 'active').whereNotNull('published_at'))
      .firstOrFail()
    if (!variant.availableForSale) invalidCart('This variant is unavailable.')
    const cart = await this.findOrCreate(token, userId)
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
  }

  async update(token: string, userId: number | undefined, id: number | string, quantity: number) {
    const cart = await this.findOrCreate(token, userId)
    const line = await cart
      .related('lines')
      .query()
      .where('id', id)
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
  }

  async remove(token: string, userId: number | undefined, id: number | string) {
    const cart = await this.findOrCreate(token, userId)
    const line = await cart.related('lines').query().where('id', id).firstOrFail()
    await line.delete()
  }
}

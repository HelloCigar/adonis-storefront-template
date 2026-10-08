import Cart from '#models/checkout/cart'
import ProductVariant from '#models/catalog/product_variant'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { errors } from '@vinejs/vine'
import { randomUUID } from 'node:crypto'
import { affectedRows } from '#models/shared/affected_rows'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

function invalidCart(message: string): never {
  throw new errors.E_VALIDATION_ERROR([{ field: 'cart', rule: 'available', message }])
}

export default class CartService {
  async findOrCreate(token: string, userId?: number) {
    const existing = await Cart.findBy('token', token)
    if (existing && existing.status !== 'active')
      invalidCart('This cart has already been submitted.')
    const cart = await Cart.firstOrCreate(
      { token, status: 'active' },
      {
        currencyCode: 'PHP',
        userId,
        expiresAt: DateTime.utc().plus({ days: 10 }),
        version: 0,
        submissionKey: randomUUID(),
      }
    )
    // Carts created before online checkout have no submission key yet.
    if (!cart.submissionKey) {
      await Cart.query()
        .where('id', cart.id)
        .whereNull('submission_key')
        .update({ submissionKey: randomUUID() })
      await cart.refresh()
    }
    return cart
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
      .whereHas('product', (query) => query.withScopes((scopes) => scopes.published()))
      .firstOrFail()
    if (!variant.isSellable) invalidCart('This variant is unavailable.')
    const cart = await this.findOrCreate(token, userId)
    await db.transaction(async (trx) => {
      cart.useTransaction(trx)
      await this.claim(cart, trx)
      variant.useTransaction(trx)
      await variant.refresh()
      const line = await cart
        .related('lines')
        .query()
        .where('product_variant_id', variant.id)
        .first()
      const nextQuantity = (line?.quantity ?? 0) + quantity
      if (
        nextQuantity > 10 ||
        (variant.quantityAvailable !== null && nextQuantity > variant.quantityAvailable)
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

  async update(token: string, userId: number | undefined, id: number, quantity: number) {
    const cart = await this.findOrCreate(token, userId)
    return db.transaction(async (trx) => {
      cart.useTransaction(trx)
      await this.claim(cart, trx)
      const line = await cart
        .related('lines')
        .query()
        .where('id', id)
        .preload('variant', (query) => query.preload('product'))
        .firstOrFail()
      const variant = line.variant
      if (
        !variant.isSellable ||
        variant.product.status !== 'active' ||
        !variant.product.publishedAt ||
        (variant.quantityAvailable !== null && quantity > variant.quantityAvailable)
      ) {
        invalidCart('The requested quantity is not available.')
      }
      line.quantity = quantity
      line.unitPriceAmount = variant.priceAmount
      await line.save()
    })
  }

  async remove(token: string, userId: number | undefined, id: number) {
    const cart = await this.findOrCreate(token, userId)
    return db.transaction(async (trx) => {
      cart.useTransaction(trx)
      await this.claim(cart, trx)
      const line = await cart.related('lines').query().where('id', id).firstOrFail()
      await line.delete()
    })
  }

  private async claim(cart: Cart, trx: TransactionClientContract) {
    const changed = await Cart.query({ client: trx })
      .where('id', cart.id)
      .where('status', 'active')
      .where('version', cart.version)
      .increment('version', 1)
    if (affectedRows(changed) !== 1) invalidCart('Your cart changed. Refresh and try again.')
    cart.version++
  }
}

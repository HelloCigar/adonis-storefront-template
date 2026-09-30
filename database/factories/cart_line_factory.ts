import factory from '@adonisjs/lucid/factories'
import CartLine from '#models/cart_line'
import ProductVariant from '#models/product_variant'
import { CartFactory } from './cart_factory.js'
import { ProductVariantFactory } from './product_variant_factory.js'

export const CartLineFactory = factory
  .define(CartLine, () => ({ quantity: 1 }))
  .before('create', async (_builder, line, ctx) => {
    const variant = line.productVariantId
      ? await ProductVariant.findOrFail(line.productVariantId, { client: ctx.$trx })
      : await ProductVariantFactory.useCtx(ctx).create()
    line.productVariantId = variant.id
    line.unitPriceAmount ??= variant.priceAmount
    line.currencyCode ??= variant.currencyCode
    if (!line.cartId) {
      const cart = await CartFactory.useCtx(ctx).merge({ currencyCode: line.currencyCode }).create()
      line.cartId = cart.id
    }
  })
  .build()

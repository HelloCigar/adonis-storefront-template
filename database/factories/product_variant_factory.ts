import factory from '@adonisjs/lucid/factories'
import ProductVariant from '#models/product_variant'
import { ProductFactory } from './product_factory.js'

export const ProductVariantFactory = factory
  .define(ProductVariant, ({ faker }) => ({
    title: 'Default',
    sku: 'SKU-' + faker.string.uuid(),
    options: {},
    priceAmount: Number(faker.commerce.price({ min: 100, max: 2500 })),
    compareAtPriceAmount: null,
    currencyCode: 'PHP',
    availableForSale: true,
    inventoryQuantity: 25,
  }))
  .state('soldOut', (variant) => {
    variant.availableForSale = false
    variant.inventoryQuantity = 0
  })
  .state('discounted', (variant) => {
    variant.compareAtPriceAmount = Math.round(variant.priceAmount * 1.25 * 100) / 100
  })
  .before('create', async (_builder, variant, ctx) => {
    if (!variant.productId) {
      const product = await ProductFactory.useCtx(ctx).apply('published').create()
      variant.productId = product.id
    }
    if (variant.position === undefined) {
      const previous = await ProductVariant.query({ client: ctx.$trx })
        .where('product_id', variant.productId)
        .max('position as last_position')
        .first()
      variant.position = Number(previous?.$extras.last_position ?? -1) + 1
    }
  })
  .build()

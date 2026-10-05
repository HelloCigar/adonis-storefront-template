import factory from '@adonisjs/lucid/factories'
import OrderLineItem from '#models/checkout/order_line_item'
import ProductVariant from '#models/catalog/product_variant'
import { OrderFactory } from './order_factory.js'

export const OrderLineItemFactory = factory
  .define(OrderLineItem, ({ faker }) => {
    const quantity = faker.number.int({ min: 1, max: 3 })
    const unitPriceMinor = faker.number.int({ min: 100, max: 2500 }) * 100
    return {
      title: faker.commerce.productName(),
      variantTitle: 'Default',
      quantity,
      unitPriceMinor,
      discountMinor: 0,
      totalMinor: unitPriceMinor * quantity,
      currencyCode: 'PHP',
      options: {},
    }
  })
  .before('create', async (_builder, line, ctx) => {
    if (!line.orderId) {
      const order = await OrderFactory.useCtx(ctx).create()
      line.orderId = order.id
    }
    if (line.productVariantId) {
      const variant = await ProductVariant.query({ client: ctx.$trx })
        .where('id', line.productVariantId)
        .preload('product')
        .preload('featuredMedia', (media) => media.preload('attachment'))
        .firstOrFail()
      line.productId = variant.productId
      line.title = variant.product.title
      line.variantTitle = variant.title
      line.sku = variant.sku
      line.options = variant.options
      // Catalogue prices are decimal pesos; order snapshots are centavos.
      line.unitPriceMinor = Math.round(variant.priceAmount * 100)
      line.currencyCode = variant.currencyCode
      const image = variant.featuredMedia?.attachment
      if (image) {
        line.imageUrl ??=
          '/attachments/' + encodeURIComponent(image.id) + '/' + encodeURIComponent(image.name)
        line.imageAltText ??= image.originalName
      }
    }
    line.totalMinor = line.unitPriceMinor * line.quantity - line.discountMinor
  })
  .build()

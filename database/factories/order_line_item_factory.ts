import factory from '@adonisjs/lucid/factories'
import OrderLineItem from '#models/checkout/order_line_item'
import ProductVariant from '#models/catalog/product_variant'
import { OrderFactory } from './order_factory.js'

export const OrderLineItemFactory = factory
  .define(OrderLineItem, ({ faker }) => {
    const quantity = faker.number.int({ min: 1, max: 3 })
    const unitPriceAmount = Number(faker.commerce.price({ min: 100, max: 2500 }))
    return {
      title: faker.commerce.productName(),
      variantTitle: 'Default',
      quantity,
      unitPriceAmount,
      discountAmount: 0,
      totalAmount: (Math.round(unitPriceAmount * 100) * quantity) / 100,
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
      line.unitPriceAmount = variant.priceAmount
      line.currencyCode = variant.currencyCode
      const image = variant.featuredMedia?.attachment
      if (image) {
        line.imageUrl ??=
          '/attachments/' + encodeURIComponent(image.id) + '/' + encodeURIComponent(image.name)
        line.imageAltText ??= image.originalName
      }
    }
    line.totalAmount =
      (Math.round(line.unitPriceAmount * 100) * line.quantity -
        Math.round(line.discountAmount * 100)) /
      100
  })
  .build()

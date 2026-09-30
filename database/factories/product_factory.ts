import factory from '@adonisjs/lucid/factories'
import Product from '#models/product'
import { DateTime } from 'luxon'
import { ProductVariantFactory } from './product_variant_factory.js'
import { createFixtureImage } from '../fixtures/image.js'

export const ProductFactory = factory
  .define(Product, ({ faker }) => {
    const title = faker.commerce.productName()
    return {
      title,
      handle: faker.helpers.slugify(title).toLowerCase() + '-' + faker.string.uuid(),
      description: faker.commerce.productDescription(),
      vendor: faker.company.name(),
      productType: faker.commerce.department(),
      status: 'draft',
      publishedAt: null,
      isGiftCard: false,
      tags: ['demo'],
      seoTitle: title,
    }
  })
  .state('published', (product) => {
    product.status = 'active'
    product.publishedAt = DateTime.utc()
  })
  .state('giftCard', (product) => {
    product.isGiftCard = true
  })
  .state('withMedia', async (product) => {
    product.media.add(await createFixtureImage(product.handle))
  })
  .relation('variants', () => ProductVariantFactory)
  .build()

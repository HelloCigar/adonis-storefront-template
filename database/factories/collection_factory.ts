import factory from '@adonisjs/lucid/factories'
import Collection from '#models/catalog/collection'
import { DateTime } from 'luxon'
import { ProductFactory } from './product_factory.js'
import { createFixtureImage } from '../fixtures/image.js'

export const CollectionFactory = factory
  .define(Collection, ({ faker }) => {
    const title = faker.commerce.department()
    return {
      title,
      handle: faker.helpers.slugify(title).toLowerCase() + '-' + faker.string.uuid(),
      description: faker.lorem.sentence(),
      seoTitle: title,
      publishedAt: null,
    }
  })
  .state('published', (collection) => {
    collection.publishedAt = DateTime.utc()
  })
  .state('withImage', async (collection) => {
    collection.image.set(await createFixtureImage(collection.handle))
  })
  .relation('products', () => ProductFactory)
  .build()

import Collection from '#models/collection'
import CollectionTransformer from '#transformers/collection_transformer'
import ProductTransformer from '#transformers/product_transformer'
import type { HttpContext } from '@adonisjs/core/http'

export default class CollectionsController {
  async index({ inertia }: HttpContext) {
    return inertia.render('collections/index', {
      collections: async () =>
        CollectionTransformer.transform(
          await Collection.query().whereNotNull('published_at').orderBy('title', 'asc')
        ),
    })
  }

  async show({ params, inertia }: HttpContext) {
    const collection = await Collection.query()
      .where('handle', params.handle)
      .whereNotNull('published_at')
      .firstOrFail()

    return inertia.render('collection/[handle]', {
      collection: () => CollectionTransformer.transform(collection),
      products: async () =>
        ProductTransformer.transform(
          await collection
            .related('products')
            .query()
            .where('status', 'active')
            .whereNotNull('published_at')
            .preload('variants', (query) => query.orderBy('position', 'asc'))
        ),
    })
  }
}

import { inject } from '@adonisjs/core'
import CatalogueService from '#services/catalogue_service'
import Collection from '#models/collection'
import CollectionTransformer from '#transformers/collection_transformer'
import CollectionCatalogueTransformer from '#transformers/collection_catalogue_transformer'
import type { HttpContext } from '@adonisjs/core/http'
import { collectionQueryValidator } from '#validators/collection'

@inject()
export default class CollectionsController {
  constructor(private catalogueService: CatalogueService) {}

  async index({ inertia }: HttpContext) {
    return inertia.render('collections/index', {
      collections: async () =>
        CollectionTransformer.transform(
          await Collection.query().whereNotNull('published_at').orderBy('title', 'asc')
        ),
    })
  }

  async show({ params, request, inertia }: HttpContext) {
    const query = await request.validateUsing(collectionQueryValidator)
    const collection = await Collection.query()
      .where('handle', params.handle)
      .whereNotNull('published_at')
      .firstOrFail()

    return inertia.render('collection/[handle]', {
      collection: () => CollectionTransformer.transform(collection),
      catalogue: async () =>
        CollectionCatalogueTransformer.transform(
          await this.catalogueService.collectionProducts(collection, query)
        ).depth(4),
    })
  }
}

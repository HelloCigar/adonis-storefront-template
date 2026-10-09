import { inject } from '@adonisjs/core'
import CatalogueService from '#services/catalog/catalogue_service'
import Collection from '#models/catalog/collection'
import CollectionTransformer from '#transformers/catalog/collection_transformer'
import CollectionCatalogueTransformer from '#transformers/catalog/collection_catalogue_transformer'
import type { HttpContext } from '@adonisjs/core/http'
import { collectionQueryValidator } from '#validators/catalog/collection'

@inject()
export default class CollectionsController {
  constructor(private catalogueService: CatalogueService) {}

  async index({ inertia }: HttpContext) {
    return inertia.render('collections/index', {
      collections: async () =>
        CollectionTransformer.transform(
          await Collection.query()
            .withScopes((scopes) => scopes.published())
            .orderBy('title', 'asc')
        ),
    })
  }

  async show({ params, request, inertia }: HttpContext) {
    const query = await request.validateUsing(collectionQueryValidator)
    const collection = await Collection.query()
      .where('handle', params.handle)
      .withScopes((scopes) => scopes.published())
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

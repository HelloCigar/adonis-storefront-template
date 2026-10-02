import { inject } from '@adonisjs/core'
import CatalogueService from '#services/catalog/catalogue_service'
import CollectionTransformer from '#transformers/catalog/collection_transformer'
import ProductTransformer from '#transformers/catalog/product_transformer'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class StorefrontController {
  constructor(private catalogueService: CatalogueService) {}

  index({ inertia }: HttpContext) {
    // Lazy props keep search/cart partial reloads from querying the catalogue again.
    return inertia.render('index', {
      bestsellingProducts: async () =>
        ProductTransformer.transform(await this.catalogueService.bestsellingProducts()),
      newestProducts: async () =>
        ProductTransformer.transform(await this.catalogueService.newestProducts(12)),
      collections: async () =>
        CollectionTransformer.transform(await this.catalogueService.newestCollections()),
    })
  }
}

import { inject } from '@adonisjs/core'
import CatalogueService from '#services/catalog/catalogue_service'
import Product from '#models/catalog/product'
import ProductTransformer from '#transformers/catalog/product_transformer'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class ProductsController {
  constructor(private catalogueService: CatalogueService) {}

  async show({ params, inertia }: HttpContext) {
    const product = await Product.query()
      .where('handle', params.handle)
      .where('status', 'active')
      .whereNotNull('published_at')
      .preload('variants', (query) => query.orderBy('position', 'asc'))
      .firstOrFail()

    return inertia.render('product/[handle]', {
      product: () => ProductTransformer.transform(product),
      recommendations: async () =>
        ProductTransformer.transform(await this.catalogueService.newestProducts(4, product.id)),
    })
  }
}

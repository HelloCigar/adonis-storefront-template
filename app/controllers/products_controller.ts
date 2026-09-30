import Product from '#models/product'
import ProductTransformer from '#transformers/product_transformer'
import type { HttpContext } from '@adonisjs/core/http'

export default class ProductsController {
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
        ProductTransformer.transform(
          await Product.query()
            .whereNot('id', product.id)
            .where('status', 'active')
            .whereNotNull('published_at')
            .preload('variants', (query) => query.orderBy('position', 'asc'))
            .orderBy('published_at', 'desc')
            .limit(4)
        ),
    })
  }
}

import Collection from '#models/collection'
import Product from '#models/product'
import CollectionTransformer from '#transformers/collection_transformer'
import ProductTransformer from '#transformers/product_transformer'
import type { HttpContext } from '@adonisjs/core/http'

export default class StorefrontController {
  index({ inertia }: HttpContext) {
    // Lazy props keep search/cart partial reloads from querying the catalogue again.
    return inertia.render('index', {
      bestsellingProducts: async () =>
        ProductTransformer.transform(
          await Product.query()
            .where('status', 'active')
            .whereNotNull('published_at')
            .preload('variants', (query) => query.orderBy('position', 'asc'))
            .orderByRaw(
              '(select coalesce(sum(order_line_items.quantity), 0) from order_line_items join product_variants on product_variants.id = order_line_items.product_variant_id join orders on orders.id = order_line_items.order_id where product_variants.product_id = products.id and orders.financial_status = ? and orders.cancelled_at is null) desc',
              ['paid']
            )
            .orderBy('id', 'desc')
            .limit(12)
        ),
      newestProducts: async () =>
        ProductTransformer.transform(
          await Product.query()
            .where('status', 'active')
            .whereNotNull('published_at')
            .preload('variants', (query) => query.orderBy('position', 'asc'))
            .orderBy('published_at', 'desc')
            .limit(12)
        ),
      collections: async () =>
        CollectionTransformer.transform(
          await Collection.query()
            .whereNotNull('published_at')
            .orderBy('published_at', 'desc')
            .limit(6)
        ),
    })
  }
}

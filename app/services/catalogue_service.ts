import Collection from '#models/collection'
import Product from '#models/product'

export default class CatalogueService {
  private publishedProducts() {
    return Product.query()
      .where('status', 'active')
      .whereNotNull('published_at')
      .preload('variants', (query) => query.orderBy('position', 'asc'))
  }

  newestProducts(limit: number, excludedProductId?: number) {
    const query = this.publishedProducts().orderBy('published_at', 'desc').limit(limit)
    if (excludedProductId !== undefined) query.whereNot('id', excludedProductId)
    return query
  }

  bestsellingProducts() {
    return this.publishedProducts()
      .orderByRaw(
        '(select coalesce(sum(order_line_items.quantity), 0) from order_line_items join product_variants on product_variants.id = order_line_items.product_variant_id join orders on orders.id = order_line_items.order_id where product_variants.product_id = products.id and orders.financial_status = ? and orders.cancelled_at is null) desc',
        ['paid']
      )
      .orderBy('id', 'desc')
      .limit(12)
  }

  newestCollections() {
    return Collection.query().whereNotNull('published_at').orderBy('published_at', 'desc').limit(6)
  }

  collectionProducts(collection: Collection) {
    return collection
      .related('products')
      .query()
      .where('status', 'active')
      .whereNotNull('published_at')
      .preload('variants', (query) => query.orderBy('position', 'asc'))
  }

  async search(search?: string) {
    if (!search) return { products: [], collections: [] }
    const pattern = '%' + search.replace(/[\\%_]/g, '\\$&') + '%'
    const [products, collections] = await Promise.all([
      this.publishedProducts()
        .whereRaw("title like ? escape '\\'", [pattern])
        .orderBy('title')
        .limit(8),
      Collection.query()
        .whereNotNull('published_at')
        .whereRaw("title like ? escape '\\'", [pattern])
        .orderBy('title')
        .limit(8),
    ])
    return { products, collections }
  }
}

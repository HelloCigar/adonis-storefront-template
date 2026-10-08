import Collection from '#models/catalog/collection'
import Product from '#models/catalog/product'
import type { CollectionQuery } from '#validators/catalog/collection'

export default class CatalogueService {
  private publishedProducts() {
    return Product.query()
      .withScopes((scopes) => scopes.published())
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
    return Collection.query()
      .withScopes((scopes) => scopes.published())
      .orderBy('published_at', 'desc')
      .limit(6)
  }

  async collectionProducts(collection: Collection, params: CollectionQuery) {
    const query = collection
      .related('products')
      .query()
      .withScopes((scopes) => scopes.published())
      .orderBy('collection_products.position', 'asc')
      .orderBy('products.id', 'asc')

    if (params.available === true) {
      query.whereHas('variants', (variants) =>
        variants
          .where('available_for_sale', true)
          .whereRaw(
            '(inventory_quantity IS NULL OR inventory_quantity > inventory_reserved_quantity)'
          )
      )
    } else if (params.available === false) {
      query.whereDoesntHave('variants', (variants) =>
        variants
          .where('available_for_sale', true)
          .whereRaw(
            '(inventory_quantity IS NULL OR inventory_quantity > inventory_reserved_quantity)'
          )
      )
    }
    if (params.vendor?.length) query.whereIn('vendor', params.vendor)

    // Filter the displayed "from" price, rather than any single matching variant.
    const minimumPrice =
      '(select coalesce(min(price_amount), 0) from product_variants where product_variants.product_id = products.id)'
    if (params.minPrice !== undefined) query.whereRaw(`${minimumPrice} >= ?`, [params.minPrice])
    if (params.maxPrice !== undefined) query.whereRaw(`${minimumPrice} <= ?`, [params.maxPrice])

    const loadPage = (page: number) =>
      query
        .clone()
        .preload('variants', (variants) => variants.orderBy('position', 'asc'))
        .paginate(page, 12)
    const [requestedPage, vendors] = await Promise.all([
      loadPage(params.page ?? 1),
      Product.query()
        .withScopes((scopes) => scopes.published())
        .whereHas('collections', (collections) =>
          collections.where('collections.id', collection.id)
        )
        .whereNotNull('vendor')
        .whereNot('vendor', '')
        .distinct('vendor')
        .orderBy('vendor', 'asc'),
    ])
    const lastPage = Math.max(1, requestedPage.lastPage)
    const products = requestedPage.currentPage > lastPage ? await loadPage(lastPage) : requestedPage

    return {
      products,
      query: { ...params, page: products.currentPage, vendor: params.vendor ?? [] },
      vendors: vendors.map((product) => product.vendor!),
      pageInfo: {
        currentPage: products.currentPage,
        lastPage,
        total: products.total,
        perPage: products.perPage,
        hasPreviousPage: products.currentPage > 1,
        hasNextPage: products.hasMorePages,
      },
    }
  }

  async search(search?: string) {
    if (!search) return { products: [], collections: [] }
    const pattern = '%' + search.replace(/[\\%_]/g, '\\$&') + '%'
    const [products, collections] = await Promise.all([
      this.publishedProducts().whereILike('title', pattern).orderBy('title').limit(8),
      Collection.query()
        .withScopes((scopes) => scopes.published())
        .whereILike('title', pattern)
        .orderBy('title')
        .limit(8),
    ])
    return { products, collections }
  }
}

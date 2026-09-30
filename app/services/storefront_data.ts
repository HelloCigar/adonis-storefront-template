import Cart from '#models/cart'
import Collection from '#models/collection'
import Product from '#models/product'
import CartTransformer from '#transformers/cart_transformer'
import SearchResultTransformer from '#transformers/search_result_transformer'
import { searchValidator } from '#validators/storefront'
import type { HttpContext } from '@adonisjs/core/http'

/** Read-only loaders used by Inertia shared props, not JSON endpoints. */
export async function loadCart({ session }: HttpContext) {
  const token = session?.get('store_cart_token') as string | undefined
  if (!token) return null
  const cart = await Cart.query().where({ token, status: 'active' }).first()
  if (!cart) return null
  await cart.load('lines', (query) =>
    query
      .orderBy('id')
      .preload('variant', (variant) =>
        variant.preload('product').preload('featuredMedia', (media) => media.preload('attachment'))
      )
  )
  return CartTransformer.transform(cart).depth(4)
}

export async function loadSearch({ request }: HttpContext) {
  const { search } = await request.validateUsing(searchValidator)
  const pattern = '%' + (search ?? '').replace(/[\\%_]/g, '\\$&') + '%'
  const [products, collections] = search
    ? await Promise.all([
        Product.query()
          .where('status', 'active')
          .whereNotNull('published_at')
          .whereRaw("title like ? escape '\\'", [pattern])
          .preload('variants', (query) => query.orderBy('position', 'asc'))
          .orderBy('title')
          .limit(8),
        Collection.query()
          .whereNotNull('published_at')
          .whereRaw("title like ? escape '\\'", [pattern])
          .orderBy('title')
          .limit(8),
      ])
    : [[], []]
  return SearchResultTransformer.transform({ products, collections }).depth(4)
}

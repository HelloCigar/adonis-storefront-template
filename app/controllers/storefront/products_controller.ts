import { inject } from '@adonisjs/core'
import CatalogueService from '#services/catalog/catalogue_service'
import Product from '#models/catalog/product'
import CatalogReviewService from '#services/catalog/review_service'
import ProductTransformer from '#transformers/catalog/product_transformer'
import ReviewTransformer from '#transformers/catalog/review_transformer'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class ProductsController {
  constructor(
    private catalogueService: CatalogueService,
    private reviewService: CatalogReviewService
  ) {}

  async show({ params, request, auth, inertia }: HttpContext) {
    const product = await Product.query()
      .where('handle', params.handle)
      .withScopes((scopes) => scopes.published())
      .preload('variants', (query) => query.orderBy('position', 'asc'))
      .firstOrFail()

    return inertia.render('product/[handle]', {
      product: () => ProductTransformer.transform(product),
      reviewSummary: () => this.reviewService.summary(product.id),
      reviews: async () => {
        const page = Math.max(1, Number.parseInt(request.input('reviewsPage', '1'), 10) || 1)
        const reviews = await this.reviewService.approvedFor(product.id, page)
        return ReviewTransformer.paginate(reviews.all(), reviews.getMeta())
      },
      viewerReview: async () => {
        if (!auth.user) return null
        const review = await this.reviewService.findByUser(auth.user.id, product.id)
        return review ? ReviewTransformer.transform(review) : null
      },
      canReview: async () =>
        auth.user ? this.reviewService.canReview(auth.user, product.id) : false,
      recommendations: async () =>
        ProductTransformer.transform(await this.catalogueService.newestProducts(4, product.id)),
    })
  }
}

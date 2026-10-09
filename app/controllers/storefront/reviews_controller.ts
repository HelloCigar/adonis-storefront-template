import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import Product from '#models/catalog/product'
import ProductReview from '#models/catalog/product_review'
import CatalogReviewService from '#services/catalog/review_service'
import { reviewValidator } from '#validators/catalog/review'

@inject()
export default class ReviewsController {
  constructor(private reviews: CatalogReviewService) {}

  async store({ params, request, response, session, bouncer, auth }: HttpContext) {
    const product = await Product.query()
      .where('id', params.productId)
      .withScopes((scopes) => scopes.published())
      .firstOrFail()
    await bouncer.with('CatalogReviewPolicy').authorize('create', product)
    const payload = await request.validateUsing(reviewValidator)
    await this.reviews.create(auth.getUserOrFail(), product.id, payload)
    session.flash('success', 'Thanks for your review. It will appear once the store approves it.')
    return response.redirect().toRoute('products.show', { handle: product.handle })
  }

  async update({ params, request, response, session, bouncer }: HttpContext) {
    const review = await ProductReview.query()
      .where('id', params.id)
      .preload('product')
      .firstOrFail()
    await bouncer.with('CatalogReviewPolicy').authorize('update', review)
    const payload = await request.validateUsing(reviewValidator)
    await this.reviews.update(review, payload)
    session.flash('success', 'Review updated. It will appear again once the store approves it.')
    return response.redirect().toRoute('products.show', { handle: review.product.handle })
  }

  async destroy({ params, response, session, bouncer }: HttpContext) {
    const review = await ProductReview.query()
      .where('id', params.id)
      .preload('product')
      .firstOrFail()
    await bouncer.with('CatalogReviewPolicy').authorize('delete', review)
    await review.delete()
    session.flash('success', 'Review deleted')
    return response.redirect().toRoute('products.show', { handle: review.product.handle })
  }
}

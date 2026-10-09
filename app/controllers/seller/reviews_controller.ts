import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import ProductReview from '#models/catalog/product_review'
import SellerReviewService from '#services/seller/review_service'
import SellerReviewTransformer from '#transformers/seller/review_transformer'
import { reviewIndexQueryValidator, reviewModerationValidator } from '#validators/seller/review'

@inject()
export default class ReviewsController {
  constructor(private reviews: SellerReviewService) {}

  async index({ request, inertia, bouncer }: HttpContext) {
    await bouncer.with('SellerReviewPolicy').authorize('viewAny')
    const query = await request.validateUsing(reviewIndexQueryValidator)
    const status = query.status ?? 'pending'
    const reviews = await this.reviews.list(status, query.page ?? 1)
    return inertia.render('seller/reviews', {
      reviews: SellerReviewTransformer.paginate(reviews.all(), reviews.getMeta()),
      filters: { status },
      counts: await this.reviews.counts(),
    })
  }

  async update({ params, request, response, session, bouncer, auth }: HttpContext) {
    const review = await ProductReview.findOrFail(params.id)
    await bouncer.with('SellerReviewPolicy').authorize('update', review)
    const payload = await request.validateUsing(reviewModerationValidator)
    await this.reviews.moderate(review, payload.status, auth.getUserOrFail())
    session.flash('success', payload.status === 'approved' ? 'Review approved' : 'Review hidden')
    return response.redirect().back()
  }
}

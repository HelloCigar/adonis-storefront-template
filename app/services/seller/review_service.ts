import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import type User from '#models/account/user'
import ProductReview, { type ReviewStatus } from '#models/catalog/product_review'

export type ReviewFilter = ReviewStatus | 'all'

export default class SellerReviewService {
  /** Newest first, across every product regardless of who created it. */
  list(status: ReviewFilter, page: number, perPage = 25) {
    const query = ProductReview.query().preload('user').preload('product')
    if (status !== 'all') query.where('status', status)
    return query.orderBy('createdAt', 'desc').orderBy('id', 'desc').paginate(page, perPage)
  }

  async counts() {
    const rows = await db
      .from('product_reviews')
      .groupBy('status')
      .select('status')
      .count('* as total')
    const counts: Record<ReviewStatus, number> = { pending: 0, approved: 0, hidden: 0 }
    for (const row of rows) {
      if (row.status in counts) counts[row.status as ReviewStatus] = Number(row.total)
    }
    return counts
  }

  /** Records who moderated and when; the review text is never touched. */
  async moderate(review: ProductReview, status: 'approved' | 'hidden', moderator: User) {
    review.merge({ status, moderatedById: moderator.id, moderatedAt: DateTime.now() })
    await review.save()
    return review
  }
}

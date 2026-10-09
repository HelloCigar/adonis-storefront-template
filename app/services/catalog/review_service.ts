import db from '@adonisjs/lucid/services/db'
import type { Infer } from '@vinejs/vine/types'
import type User from '#models/account/user'
import ProductReview from '#models/catalog/product_review'
import type { reviewValidator } from '#validators/catalog/review'

export type ReviewPayload = Infer<typeof reviewValidator>

export interface ReviewSummary {
  average: number | null
  count: number
  distribution: Record<1 | 2 | 3 | 4 | 5, number>
}

/** Public display name: first name plus last initial, then first word of the full name. */
export function reviewAuthorName(
  author: Pick<User, 'firstName' | 'lastName' | 'fullName'> | null | undefined
) {
  const first = author?.firstName?.trim()
  const last = author?.lastName?.trim()
  if (first) return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first
  return author?.fullName?.trim().split(/\s+/)[0] || 'Customer'
}

export default class CatalogReviewService {
  /** The most recent order of this account that holds the product in a delivered shipment. */
  async eligibleOrderId(userId: number, productId: number) {
    const row = await db
      .from('orders')
      .where('orders.user_id', userId)
      .whereExists((query) =>
        query
          .from('order_line_items')
          .whereColumn('order_line_items.order_id', 'orders.id')
          .where('order_line_items.product_id', productId)
      )
      .whereExists((query) =>
        query
          .from('shipments')
          .whereColumn('shipments.order_id', 'orders.id')
          .where('shipments.state', 'delivered')
      )
      .orderBy('orders.id', 'desc')
      .select('orders.id')
      .first()
    return row ? (row.id as number) : null
  }

  /** Signed-in, delivered a purchase of this product, and no review of it yet. */
  async canReview(user: User, productId: number) {
    if (await this.findByUser(user.id, productId)) return false
    return (await this.eligibleOrderId(user.id, productId)) !== null
  }

  findByUser(userId: number, productId: number) {
    return ProductReview.query()
      .where('userId', userId)
      .where('productId', productId)
      .preload('user')
      .first()
  }

  async create(user: User, productId: number, payload: ReviewPayload) {
    const orderId = await this.eligibleOrderId(user.id, productId)
    return ProductReview.create({
      productId,
      userId: user.id,
      orderId,
      rating: payload.rating,
      title: payload.title?.trim() || null,
      body: payload.body?.trim() || null,
      status: 'pending',
    })
  }

  /** An edit goes back through moderation. */
  async update(review: ProductReview, payload: ReviewPayload) {
    review.merge({
      rating: payload.rating,
      title: payload.title?.trim() || null,
      body: payload.body?.trim() || null,
      status: 'pending',
      moderatedById: null,
      moderatedAt: null,
    })
    await review.save()
    return review
  }

  /** Rating summary counts approved reviews only. */
  async summary(productId: number): Promise<ReviewSummary> {
    const rows = await db
      .from('product_reviews')
      .where('product_id', productId)
      .where('status', 'approved')
      .groupBy('rating')
      .select('rating')
      .count('* as total')

    const distribution: ReviewSummary['distribution'] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    let count = 0
    let sum = 0
    for (const row of rows) {
      const rating = Number(row.rating) as keyof ReviewSummary['distribution']
      const total = Number(row.total)
      if (!(rating in distribution)) continue
      distribution[rating] = total
      count += total
      sum += rating * total
    }
    return {
      average: count ? Math.round((sum / count) * 10) / 10 : null,
      count,
      distribution,
    }
  }

  /** Approved reviews, newest first; ids keep ties stable across pages. */
  approvedFor(productId: number, page: number, perPage = 10) {
    return ProductReview.query()
      .where('productId', productId)
      .withScopes((scopes) => scopes.approved())
      .preload('user')
      .orderBy('createdAt', 'desc')
      .orderBy('id', 'desc')
      .paginate(page, perPage)
  }
}

import Order from '#models/checkout/order'
import ProductReview from '#models/catalog/product_review'
import ProductVariant from '#models/catalog/product_variant'
import type { DateTime } from 'luxon'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import { inject } from '@adonisjs/core'
import OrderQueueService from '#services/seller/order_queue_service'

/** How many examples each group lists; its count still covers every match. */
const previewLimit = 3

export interface AttentionGroup<Item> {
  count: number
  items: Item[]
}

export interface AttentionOrder {
  id: string
  number: string
  customer: string
  /** When the order started waiting on this step. */
  since: DateTime | null
}

type OrderQuery = ModelQueryBuilderContract<typeof Order>

/**
 * Work waiting on staff, for the dashboard home. Counts are a summary only: the order, inbox,
 * review, and stock screens still enforce their own guards before anything changes. Order groups
 * use the same stages as the order list's queue tabs, so their counts match.
 */
@inject()
export default class AttentionService {
  constructor(private queue: OrderQueueService) {}

  async summarize() {
    const [toPack, toShip, paymentReview, unreadChats, pendingReviews, outOfStock] =
      await Promise.all([
        this.orders(
          (query) => this.queue.toPack(query),
          'processed_at',
          (order) => order.paidAt ?? order.processedAt
        ),
        this.orders(
          (query) => this.queue.toShip(query),
          'processed_at',
          (order) => order.shipments[0]?.packingAt ?? null,
          (query) => query.preload('shipments')
        ),
        this.orders(
          (query) => this.queue.needsAttention(query),
          'updated_at',
          (order) => order.updatedAt
        ),
        this.unreadChats(),
        this.pendingReviews(),
        this.outOfStock(),
      ])
    return { toPack, toShip, paymentReview, unreadChats, pendingReviews, outOfStock }
  }

  private async orders(
    scope: (query: OrderQuery) => void,
    oldestFirst: string,
    since: (order: Order) => DateTime | null,
    preload?: (query: OrderQuery) => void
  ): Promise<AttentionGroup<AttentionOrder>> {
    const countQuery = Order.query()
    scope(countQuery)
    const listQuery = Order.query().preload('user')
    scope(listQuery)
    preload?.(listQuery)

    const [counted, orders] = await Promise.all([
      countQuery.count('* as total').first(),
      listQuery.orderBy(oldestFirst, 'asc').orderBy('id', 'asc').limit(previewLimit),
    ])
    return {
      count: Number(counted?.$extras.total ?? 0),
      items: orders.map((order) => ({
        id: order.id,
        number: order.number,
        customer: order.user?.fullName?.trim() || order.email,
        since: since(order),
      })),
    }
  }

  /** Conversations with customer messages no staff member has opened yet. */
  private async unreadChats() {
    const unread = (query: OrderQuery) =>
      query.whereHas('messages', (messages) =>
        messages.where('sender_role', 'customer').whereNull('read_at')
      )

    const countQuery = Order.query()
    unread(countQuery)
    const listQuery = Order.query()
      .preload('user')
      .withCount('messages', (messages) =>
        messages.where('sender_role', 'customer').whereNull('read_at').as('unread_count')
      )
      .withAggregate('messages', (messages) =>
        messages
          .where('sender_role', 'customer')
          .whereNull('read_at')
          .min('created_at')
          .as('waiting_since')
      )
      .preload('messages', (messages) =>
        messages
          .where('sender_role', 'customer')
          .whereNull('read_at')
          .groupOrderBy('id', 'desc')
          .groupLimit(1)
      )
    unread(listQuery)

    const [counted, orders] = await Promise.all([
      countQuery.count('* as total').first(),
      listQuery.orderBy('waiting_since', 'asc').orderBy('id', 'asc').limit(previewLimit),
    ])
    return {
      count: Number(counted?.$extras.total ?? 0),
      items: orders.map((order) => ({
        orderId: order.id,
        number: order.number,
        customer: order.user?.fullName?.trim() || order.email,
        unread: Number(order.$extras.unread_count ?? 0),
        preview: order.messages[0]?.body ?? '',
        since: order.messages[0]?.createdAt ?? null,
      })),
    }
  }

  /** Customer reviews waiting for staff to approve or hide them. */
  private async pendingReviews() {
    const [counted, reviews] = await Promise.all([
      ProductReview.query().where('status', 'pending').count('* as total').first(),
      ProductReview.query()
        .where('status', 'pending')
        .preload('product')
        .preload('user')
        .orderBy('created_at', 'asc')
        .orderBy('id', 'asc')
        .limit(previewLimit),
    ])
    return {
      count: Number(counted?.$extras.total ?? 0),
      items: reviews.map((review) => ({
        id: review.id,
        product: review.product.title,
        rating: review.rating,
        customer: review.user?.fullName?.trim() || 'A customer',
        since: review.createdAt,
      })),
    }
  }

  /**
   * Tracked variants on live products with nothing left to sell, whether or not staff have
   * also turned off their availability. Units held by pending orders count as unavailable.
   */
  private async outOfStock() {
    const soldOut = () =>
      ProductVariant.query()
        .whereNotNull('inventory_quantity')
        .whereRaw('inventory_quantity - coalesce(inventory_reserved_quantity, 0) <= 0')
        .whereHas('product', (product) => product.where('status', 'active'))

    const [counted, variants] = await Promise.all([
      soldOut().count('* as total').first(),
      soldOut()
        .preload('product')
        .orderBy('updated_at', 'desc')
        .orderBy('id', 'asc')
        .limit(previewLimit),
    ])
    return {
      count: Number(counted?.$extras.total ?? 0),
      items: variants.map((variant) => ({
        id: variant.id,
        productId: variant.productId,
        product: variant.product.title,
        variant: variant.title,
      })),
    }
  }
}

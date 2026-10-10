import { BaseTransformer } from '@adonisjs/core/transformers'
import type AttentionService from '#services/dashboard/attention_service'
import type { DateTime } from 'luxon'

type Attention = Awaited<ReturnType<AttentionService['summarize']>>

const iso = (value: DateTime | null) => value?.toISO() ?? null

export default class AttentionTransformer extends BaseTransformer<Attention> {
  toObject() {
    const { toPack, toShip, paymentReview, unreadChats, pendingReviews, outOfStock } = this.resource
    const orders = (group: Attention['toPack']) => ({
      count: group.count,
      items: group.items.map((item) => ({ ...item, since: iso(item.since) })),
    })
    return {
      toPack: orders(toPack),
      toShip: orders(toShip),
      paymentReview: orders(paymentReview),
      unreadChats: {
        count: unreadChats.count,
        items: unreadChats.items.map((item) => ({ ...item, since: iso(item.since) })),
      },
      pendingReviews: {
        count: pendingReviews.count,
        items: pendingReviews.items.map((item) => ({ ...item, since: iso(item.since) })),
      },
      outOfStock,
    }
  }
}

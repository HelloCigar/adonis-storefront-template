<script setup lang="ts">
import { computed } from 'vue'
import { formatDistanceToNowStrict, parseISO } from 'date-fns'
import type { Data } from '@generated/data'
import { urlFor } from '~/client'

type Attention = Data.Dashboard.Attention

const props = defineProps<{ attention: Attention }>()

interface Row {
  key: string
  to: string
  title: string
  detail: string
}

interface Group {
  id: string
  title: string
  reason: string
  quiet: string
  icon: string
  tone: 'primary' | 'warning'
  count: number
  viewAll: string
  viewAllLabel: string
  rows: Row[]
}

const waiting = (since: string | null) =>
  since ? `waiting ${formatDistanceToNowStrict(parseISO(since))}` : ''

const detail = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(' · ')

const orderRows = (group: Attention['toPack']): Row[] =>
  group.items.map((item) => ({
    key: `order-${item.id}`,
    to: urlFor('seller.orders.show', { id: item.id }),
    title: item.number,
    detail: detail(item.customer, waiting(item.since)),
  }))

const groups = computed<Group[]>(() => {
  const { paymentReview, toPack, toShip, unreadChats, pendingReviews, outOfStock } = props.attention

  return [
    {
      id: 'payment-review',
      title: 'Payments to review',
      reason: 'A payment needs a staff decision before the order can move on.',
      quiet: 'No payments to review',
      icon: 'i-lucide-circle-alert',
      tone: 'warning',
      count: paymentReview.count,
      viewAll: urlFor('seller.orders.index', {}, { qs: { stage: 'needs_attention' } }),
      viewAllLabel: 'View all in Orders',
      rows: orderRows(paymentReview),
    },
    {
      id: 'to-pack',
      title: 'Ready to pack',
      reason: 'Paid and waiting to be packed.',
      quiet: 'Nothing to pack',
      icon: 'i-lucide-package-open',
      tone: 'primary',
      count: toPack.count,
      viewAll: urlFor('seller.orders.index', {}, { qs: { stage: 'to_pack' } }),
      viewAllLabel: 'View all in Orders',
      rows: orderRows(toPack),
    },
    {
      id: 'to-ship',
      title: 'Ready to ship',
      reason: 'Packed and waiting for a shipment.',
      quiet: 'Nothing to ship',
      icon: 'i-lucide-truck',
      tone: 'primary',
      count: toShip.count,
      viewAll: urlFor('seller.orders.index', {}, { qs: { stage: 'to_ship' } }),
      viewAllLabel: 'View all in Orders',
      rows: orderRows(toShip),
    },
    {
      id: 'unread-chats',
      title: 'Unread messages',
      reason: 'Customers are waiting for a reply.',
      quiet: 'No unread messages',
      icon: 'i-lucide-message-circle',
      tone: 'primary',
      count: unreadChats.count,
      viewAll: urlFor('inbox', {}, { qs: { filter: 'unread' } }),
      viewAllLabel: 'View all unread messages',
      rows: unreadChats.items.map((item) => ({
        key: `chat-${item.orderId}`,
        to: urlFor('inbox', {}, { qs: { order: item.orderId } }),
        title: `${item.customer} · ${item.number}`,
        detail: detail(item.preview, waiting(item.since)),
      })),
    },
    {
      id: 'pending-reviews',
      title: 'Reviews to moderate',
      reason: 'New reviews stay hidden until you approve them.',
      quiet: 'No reviews to moderate',
      icon: 'i-lucide-star',
      tone: 'primary',
      count: pendingReviews.count,
      viewAll: urlFor('seller.reviews.index'),
      viewAllLabel: 'View all reviews',
      rows: pendingReviews.items.map((item) => ({
        key: `review-${item.id}`,
        to: urlFor('seller.reviews.index'),
        title: item.product,
        detail: detail(`${item.rating}★`, item.customer, waiting(item.since)),
      })),
    },
    {
      id: 'out-of-stock',
      title: 'Out of stock',
      reason: 'Customers cannot buy these variants until you restock.',
      quiet: 'Nothing out of stock',
      icon: 'i-lucide-package-x',
      tone: 'primary',
      count: outOfStock.count,
      viewAll: urlFor('seller.products.index'),
      viewAllLabel: 'View all products',
      rows: outOfStock.items.map((item) => ({
        key: `stock-${item.id}`,
        to: urlFor('seller.stock_adjustments.index', {
          productId: item.productId,
          variantId: item.id,
        }),
        title: item.product,
        detail: item.variant,
      })),
    },
  ]
})

const active = computed(() => groups.value.filter((group) => group.count > 0))
const quiet = computed(() =>
  groups.value
    .filter((group) => group.count === 0)
    .map((group) => group.quiet)
    .join(' · ')
)

const iconUi = {
  primary: 'bg-primary/10 text-primary ring ring-inset ring-primary/25',
  warning: 'bg-warning/10 text-warning ring ring-inset ring-warning/25',
}
</script>

<template>
  <section aria-labelledby="home-attention-title" class="flex flex-col gap-3">
    <h2 id="home-attention-title" class="text-base font-semibold text-highlighted">
      Needs your attention
    </h2>

    <div
      v-if="!active.length"
      class="flex flex-col items-center gap-2 rounded-lg bg-elevated/50 px-4 py-8 text-center ring ring-default"
    >
      <span class="rounded-full bg-success/10 p-3 text-success ring ring-inset ring-success/25">
        <UIcon name="i-lucide-check" class="size-6" aria-hidden="true" />
      </span>
      <p class="text-lg font-semibold text-highlighted">You're all caught up</p>
      <p class="max-w-md text-sm text-muted">
        New orders, messages and reviews that need you will appear here.
      </p>
    </div>

    <template v-else>
      <ul class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <li v-for="group in active" :key="group.id" class="min-w-0">
          <article
            :aria-labelledby="`home-attention-${group.id}`"
            class="flex h-full flex-col gap-3 rounded-lg bg-elevated/50 p-4 ring ring-default"
          >
            <div class="flex items-start gap-3">
              <span class="shrink-0 rounded-full p-2.5" :class="iconUi[group.tone]">
                <UIcon :name="group.icon" class="size-5" aria-hidden="true" />
              </span>
              <div class="min-w-0 flex-1">
                <h3 :id="`home-attention-${group.id}`" class="text-sm font-medium text-highlighted">
                  {{ group.title }}
                </h3>
                <p class="text-xs text-muted">{{ group.reason }}</p>
              </div>
              <span class="text-3xl font-semibold leading-none text-highlighted tabular-nums">
                {{ group.count }}
              </span>
            </div>

            <ul class="flex flex-col divide-y divide-default border-t border-default">
              <li v-for="row in group.rows" :key="row.key">
                <ULink
                  :to="row.to"
                  class="-mx-2 flex min-w-0 flex-col rounded-md px-2 py-2 hover:bg-elevated"
                >
                  <span class="truncate text-sm font-medium text-highlighted">{{ row.title }}</span>
                  <span v-if="row.detail" class="truncate text-xs text-muted">{{
                    row.detail
                  }}</span>
                </ULink>
              </li>
            </ul>

            <ULink
              v-if="group.count > group.rows.length"
              :to="group.viewAll"
              class="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {{ group.viewAllLabel }}
              <UIcon name="i-lucide-arrow-right" class="size-4" aria-hidden="true" />
            </ULink>
          </article>
        </li>
      </ul>

      <p v-if="quiet" class="text-sm text-muted">{{ quiet }}</p>
    </template>
  </section>
</template>

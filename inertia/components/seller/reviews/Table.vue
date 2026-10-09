<script setup lang="ts">
import { computed } from 'vue'
import { Form, Link, useRouter } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import type { TableColumn, TabsItem } from '@nuxt/ui'

type Status = 'pending' | 'approved' | 'hidden' | 'all'

const props = defineProps<{
  reviews: {
    data: Data.Seller.Review[]
    metadata: { total: number; perPage: number; currentPage: number }
  }
  filters: { status: Status }
  counts: { pending: number; approved: number; hidden: number }
}>()
const router = useRouter()

const dateTime = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Manila',
})
const statusBadges = {
  pending: { label: 'Pending', color: 'warning' },
  approved: { label: 'Approved', color: 'success' },
  hidden: { label: 'Hidden', color: 'neutral' },
} as const
const emptyMessages: Record<Status, string> = {
  pending: 'No pending reviews.',
  approved: 'No approved reviews.',
  hidden: 'No hidden reviews.',
  all: 'No reviews yet.',
}

const tabItems = computed<TabsItem[]>(() => [
  { label: 'Pending', value: 'pending', badge: props.counts.pending },
  { label: 'Approved', value: 'approved', badge: props.counts.approved },
  { label: 'Hidden', value: 'hidden', badge: props.counts.hidden },
  {
    label: 'All',
    value: 'all',
    badge: props.counts.pending + props.counts.approved + props.counts.hidden,
  },
])
const selectedTab = computed({
  get: () => props.filters.status,
  set: (status: string) => {
    if (status === props.filters.status) return
    router.visit({ route: 'seller.reviews.index', qs: { status: status as Status } })
  },
})
const visitPage = (page: number) =>
  router.visit({
    route: 'seller.reviews.index',
    qs: { status: props.filters.status, page },
  })

const columns: TableColumn<Data.Seller.Review>[] = [
  { id: 'product', header: 'Product' },
  { id: 'customer', header: 'Customer' },
  { id: 'rating', header: 'Rating' },
  { id: 'review', header: 'Review' },
  { id: 'status', header: 'Status' },
  { id: 'date', header: 'Date' },
  { id: 'actions', header: () => null },
]
</script>

<template>
  <UDashboardPanel id="reviews">
    <template #header>
      <UDashboardNavbar title="Reviews">
        <template #leading><UDashboardSidebarCollapse /></template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <p class="text-sm text-muted">
        Approve or hide customer reviews before they show in the shop.
      </p>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <UTabs
          v-model="selectedTab"
          :items="tabItems"
          :content="false"
          size="sm"
          :ui="{ trigger: 'grow-0' }"
        />
      </div>
      <UTable
        :data="reviews.data"
        :columns="columns"
        class="shrink-0"
        :ui="{
          base: 'border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default align-top',
          separator: 'h-0',
        }"
      >
        <template #product-cell="{ row }">
          <Link
            route="products.show"
            :params="{ handle: row.original.product.handle }"
            class="block max-w-48 whitespace-normal font-medium text-primary [overflow-wrap:anywhere] hover:underline"
            >{{ row.original.product.title }}</Link
          >
        </template>
        <template #customer-cell="{ row }">
          <div class="max-w-52 whitespace-normal [overflow-wrap:anywhere]">
            <p class="font-medium text-highlighted">{{ row.original.authorName }}</p>
            <p class="text-sm text-muted">{{ row.original.customerEmail }}</p>
            <Link
              v-if="row.original.orderId"
              route="seller.orders.show"
              :params="{ id: row.original.orderId }"
              class="text-sm text-primary hover:underline"
              >View order</Link
            >
          </div>
        </template>
        <template #rating-cell="{ row }">
          <span
            role="img"
            :aria-label="`${row.original.rating} out of 5`"
            class="inline-flex items-center gap-1.5"
          >
            <span class="inline-flex" aria-hidden="true">
              <UIcon
                v-for="star in 5"
                :key="star"
                name="i-lucide-star"
                class="size-4"
                :class="star <= row.original.rating ? 'text-warning fill-current' : 'text-dimmed'"
              />
            </span>
            <span class="text-sm tabular-nums text-muted" aria-hidden="true"
              >{{ row.original.rating }}/5</span
            >
          </span>
        </template>
        <template #review-cell="{ row }">
          <div class="w-80 max-w-full whitespace-normal [overflow-wrap:anywhere]">
            <p v-if="row.original.title" class="line-clamp-1 font-semibold text-highlighted">
              {{ row.original.title }}
            </p>
            <p class="line-clamp-3 text-sm text-default" :title="row.original.body ?? undefined">
              {{ row.original.body }}
            </p>
          </div>
        </template>
        <template #status-cell="{ row }">
          <UBadge
            :label="statusBadges[row.original.status].label"
            :color="statusBadges[row.original.status].color"
            variant="subtle"
          />
        </template>
        <template #date-cell="{ row }">
          <span class="whitespace-nowrap text-sm text-muted">{{
            row.original.createdAt ? dateTime.format(new Date(row.original.createdAt)) : '—'
          }}</span>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex items-center justify-end gap-2">
            <Form
              v-if="row.original.status !== 'approved'"
              v-slot="{ processing }"
              route="seller.reviews.update"
              :params="{ id: row.original.id }"
              :options="{ preserveScroll: true }"
              disable-while-processing
            >
              <input type="hidden" name="status" value="approved" />
              <UButton
                type="submit"
                label="Approve"
                icon="i-lucide-check"
                color="success"
                variant="subtle"
                size="sm"
                :loading="processing"
              />
            </Form>
            <Form
              v-if="row.original.status !== 'hidden'"
              v-slot="{ processing }"
              route="seller.reviews.update"
              :params="{ id: row.original.id }"
              :options="{ preserveScroll: true }"
              disable-while-processing
            >
              <input type="hidden" name="status" value="hidden" />
              <UButton
                type="submit"
                label="Hide"
                icon="i-lucide-eye-off"
                color="neutral"
                variant="subtle"
                size="sm"
                :loading="processing"
              />
            </Form>
          </div>
        </template>
        <template #empty>
          <div class="py-12 text-center">
            <UIcon name="i-lucide-star" class="mx-auto mb-3 block size-8 text-dimmed" />
            <p class="font-medium text-highlighted">{{ emptyMessages[filters.status] }}</p>
          </div>
        </template>
      </UTable>
      <div
        v-if="reviews.metadata.total > reviews.metadata.perPage"
        class="flex flex-wrap items-center justify-between gap-3 border-t border-default pt-4 mt-auto"
      >
        <p class="text-sm text-muted">{{ reviews.metadata.total }} reviews</p>
        <UPagination
          :page="reviews.metadata.currentPage"
          :items-per-page="reviews.metadata.perPage"
          :total="reviews.metadata.total"
          @update:page="visitPage"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>

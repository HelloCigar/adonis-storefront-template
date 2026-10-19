<script setup lang="ts">
import { computed } from 'vue'
import { usePage } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import { urlFor } from '~/client'
import { orderMoney } from '~/components/seller/orders/presentation'

const props = defineProps<{
  stats: Data.Dashboard.Summary['stats']
  chart: Data.Dashboard.Summary['chart']
  currency: string
}>()

/** One figure per chart bucket, for a card's sparkline. */
const trend = (value: (bucket: Data.Dashboard.Summary['chart'][number]) => number) =>
  props.chart.map((bucket) => ({ date: bucket.date, value: value(bucket) }))

const page = usePage()
const ordersUrl = computed(() =>
  page.props.permissions.manageStore ? urlFor('seller.orders.index') : undefined
)

const cards = computed(() => [
  {
    title: 'Gross sales',
    icon: 'i-lucide-circle-dollar-sign',
    value: orderMoney(props.stats.grossSales.value, props.currency),
    change: props.stats.grossSales.change,
    trend: trend((bucket) => bucket.amount),
    to: ordersUrl.value,
  },
  {
    title: 'Paid orders',
    icon: 'i-lucide-shopping-cart',
    value: props.stats.paidOrders.value.toLocaleString('en-PH'),
    change: props.stats.paidOrders.change,
    trend: trend((bucket) => bucket.orders),
    to: ordersUrl.value,
  },
  {
    title: 'Average order',
    icon: 'i-lucide-receipt',
    value: orderMoney(props.stats.averageOrder.value, props.currency),
    change: props.stats.averageOrder.change,
    trend: trend((bucket) => (bucket.orders ? bucket.amount / bucket.orders : 0)),
    to: ordersUrl.value,
  },
  {
    title: 'New customers',
    icon: 'i-lucide-users',
    value: props.stats.newCustomers.value.toLocaleString('en-PH'),
    change: props.stats.newCustomers.change,
    trend: trend((bucket) => bucket.customers),
    to: page.props.permissions.manageUsers ? urlFor('seller.users.index') : undefined,
  },
])
</script>

<template>
  <UPageGrid class="lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-px">
    <UPageCard
      v-for="card in cards"
      :key="card.title"
      :icon="card.icon"
      :title="card.title"
      :to="card.to"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25',
        title: 'font-normal text-muted text-xs uppercase',
      }"
      class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
    >
      <div class="flex items-center gap-2">
        <span class="text-2xl font-semibold text-highlighted">
          {{ card.value }}
        </span>

        <UBadge
          v-if="card.change !== null"
          :color="card.change > 0 ? 'success' : card.change < 0 ? 'error' : 'neutral'"
          variant="subtle"
          class="text-xs"
          title="Compared with the previous period of the same length"
        >
          {{ card.change > 0 ? '+' : '' }}{{ card.change }}%
        </UBadge>
      </div>

      <!-- Decorative: the card is a link, so the chart must not add a focus stop inside it. -->
      <div class="w-full" inert aria-hidden="true">
        <UChart
          type="area"
          curve="monotone"
          :data="card.trend"
          index="date"
          :categories="[{ key: 'value', label: card.title, color: 'primary' }]"
          :height="56"
          :x-axis="false"
          :y-axis="false"
          :grid="false"
          :legend="false"
          :tooltip="false"
        />
      </div>
    </UPageCard>
  </UPageGrid>
</template>

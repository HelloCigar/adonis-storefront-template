<script setup lang="ts">
import { computed } from 'vue'
import { usePage } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import { urlFor } from '~/client'
import { orderMoney } from '~/components/seller/orders/presentation'

const props = defineProps<{
  stats: Data.Dashboard.Summary['stats']
  currency: string
}>()

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
    to: ordersUrl.value,
  },
  {
    title: 'Paid orders',
    icon: 'i-lucide-shopping-cart',
    value: props.stats.paidOrders.value.toLocaleString('en-PH'),
    change: props.stats.paidOrders.change,
    to: ordersUrl.value,
  },
  {
    title: 'Average order',
    icon: 'i-lucide-receipt',
    value: orderMoney(props.stats.averageOrder.value, props.currency),
    change: props.stats.averageOrder.change,
    to: ordersUrl.value,
  },
  {
    title: 'New customers',
    icon: 'i-lucide-users',
    value: props.stats.newCustomers.value.toLocaleString('en-PH'),
    change: props.stats.newCustomers.change,
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
    </UPageCard>
  </UPageGrid>
</template>

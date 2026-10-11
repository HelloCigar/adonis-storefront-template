<script setup lang="ts">
import { computed } from 'vue'
import type { Data } from '@generated/data'
import type { TableColumn } from '@nuxt/ui'
import { orderMoney } from './presentation'

const props = defineProps<{ order: Data.Seller.Order }>()
const money = (amount: number) => orderMoney(amount, props.order.currencyCode)
const quantity = computed(
  () => props.order.lineItems?.reduce((total, item) => total + item.quantity, 0) || 0
)
const totals = computed(() =>
  [
    { label: 'Subtotal', amount: props.order.subtotalAmount, always: true },
    {
      label: props.order.discountCode ? `Discount (${props.order.discountCode})` : 'Discount',
      amount: -props.order.discountAmount,
      always: false,
    },
    { label: 'Shipping', amount: props.order.shippingAmount, always: true },
    { label: 'Tax', amount: props.order.taxAmount, always: false },
  ].filter((row) => row.always || row.amount !== 0)
)
const columns: TableColumn<Data.Checkout.OrderLineItem>[] = [
  { accessorKey: 'title', header: 'Product' },
  { accessorKey: 'quantity', header: 'Quantity' },
  {
    accessorKey: 'totalAmount',
    header: 'Total',
    cell: ({ row }) => money(row.original.totalAmount),
  },
]
</script>

<template>
  <section aria-labelledby="order-items-title">
    <div class="flex items-center justify-between mb-3 gap-3">
      <h2 id="order-items-title" class="text-lg font-semibold text-highlighted">Order contents</h2>
      <span class="text-sm text-muted">{{ quantity }} {{ quantity === 1 ? 'item' : 'items' }}</span>
    </div>
    <UTable
      v-if="order.lineItems?.length"
      :data="order.lineItems || []"
      :columns="columns"
      class="hidden sm:block"
      :ui="{ td: 'tabular-nums align-top', th: 'text-sm' }"
    >
      <template #title-cell="{ row }"
        ><div class="min-w-48 whitespace-normal [overflow-wrap:anywhere]">
          <p class="font-medium text-highlighted">{{ row.original.title }}</p>
          <p v-if="row.original.variantTitle || row.original.sku" class="mt-1 text-sm text-muted">
            <span v-if="row.original.variantTitle">{{ row.original.variantTitle }}</span
            ><span v-if="row.original.variantTitle && row.original.sku"> · </span
            ><span v-if="row.original.sku"
              >SKU <bdi>{{ row.original.sku }}</bdi></span
            >
          </p>
          <p class="mt-1 text-sm text-muted">{{ money(row.original.unitPriceAmount) }} each</p>
        </div></template
      >
    </UTable>
    <ul v-if="order.lineItems?.length" class="divide-y divide-default sm:hidden">
      <li v-for="item in order.lineItems" :key="item.id" class="py-4 first:pt-0">
        <p class="font-medium text-highlighted [overflow-wrap:anywhere]">
          {{ item.title }}
        </p>
        <p v-if="item.variantTitle" class="text-sm text-muted mt-1 [overflow-wrap:anywhere]">
          {{ item.variantTitle }}
        </p>
        <p v-if="item.sku" class="text-sm text-muted mt-1 [overflow-wrap:anywhere]">
          SKU: <bdi>{{ item.sku }}</bdi>
        </p>
        <dl class="flex flex-wrap justify-between gap-3 mt-3 text-sm tabular-nums">
          <div>
            <dt class="sr-only">Quantity and unit price</dt>
            <dd>{{ item.quantity }} × {{ money(item.unitPriceAmount) }}</dd>
          </div>
          <div>
            <dt class="sr-only">Line total</dt>
            <dd class="font-semibold text-highlighted">{{ money(item.totalAmount) }}</dd>
          </div>
        </dl>
      </li>
    </ul>
    <p v-else class="text-sm text-muted py-4">No items are recorded for this order.</p>
    <dl class="ml-auto w-full sm:max-w-xs mt-5 space-y-2 text-sm tabular-nums">
      <div v-for="item in totals" :key="item.label" class="flex justify-between gap-4">
        <dt class="text-muted">{{ item.label }}</dt>
        <dd>{{ money(item.amount) }}</dd>
      </div>
      <div
        class="flex justify-between gap-4 border-t border-default pt-3 font-semibold text-highlighted"
      >
        <dt>Total</dt>
        <dd>{{ money(order.totalAmount) }}</dd>
      </div>
    </dl>
  </section>
</template>

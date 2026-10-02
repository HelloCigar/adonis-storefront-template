<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import type { TableColumn } from '@nuxt/ui'
import { urlFor } from '~/client'
import ResourceTable from '~/components/seller/ResourceTable.vue'
defineProps<{ orders: Data.Seller.Order[] }>()
const badge = resolveComponent('UBadge')
const columns: TableColumn<Data.Seller.Order>[] = [
  { accessorKey: 'number', header: 'Order' },
  { accessorKey: 'email', header: 'Customer' },
  {
    accessorKey: 'financialStatus',
    header: 'Payment',
    cell: ({ row }) =>
      h(badge, {
        label: row.original.financialStatus.replaceAll('_', ' '),
        color: row.original.financialStatus === 'paid' ? 'success' : 'warning',
        variant: 'subtle',
        class: 'capitalize',
      }),
  },
  {
    accessorKey: 'fulfillmentStatus',
    header: 'Fulfillment',
    cell: ({ row }) =>
      h(badge, {
        label: row.original.fulfillmentStatus,
        color: row.original.fulfillmentStatus === 'fulfilled' ? 'success' : 'neutral',
        variant: 'subtle',
        class: 'capitalize',
      }),
  },
  {
    accessorKey: 'totalAmount',
    header: 'Total',
    cell: ({ row }) =>
      new Intl.NumberFormat('en', {
        style: 'currency',
        currency: row.original.currencyCode,
      }).format(row.original.totalAmount),
  },
  {
    accessorKey: 'processedAt',
    header: 'Date',
    cell: ({ row }) =>
      row.original.processedAt ? new Date(row.original.processedAt).toLocaleDateString() : '—',
  },
]
</script>

<template>
  <Head title="Orders" />
  <ResourceTable
    title="Orders"
    singular="order"
    description="Review purchases and manage payment and fulfillment statuses."
    :rows="orders"
    :columns="columns"
    :search-text="(order) => `${order.number} ${order.email}`"
    :status="(order) => order.fulfillmentStatus"
    :filters="
      ['unfulfilled', 'partial', 'fulfilled'].map((value) => ({
        label: value[0].toUpperCase() + value.slice(1),
        value,
      }))
    "
    :actions="
      (order) => [
        {
          label: 'View order',
          icon: 'i-lucide-eye',
          onSelect: () => router.visit(urlFor('seller.orders.show', { id: order.id })),
        },
      ]
    "
  />
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { usePage } from '@inertiajs/vue3'
import type { TableColumn } from '@nuxt/ui'
import type { Data } from '@generated/data'
import { urlFor } from '~/client'
import { orderDate, orderLabel, orderMoney } from '~/components/seller/orders/presentation'

type RecentOrder = Data.Dashboard.Summary['recentOrders'][number]

defineProps<{
  orders: RecentOrder[]
}>()

const page = usePage()
const UBadge = resolveComponent('UBadge')
const ULink = resolveComponent('ULink')

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  paid: 'success',
  pending: 'warning',
  partially_refunded: 'neutral',
  refunded: 'neutral',
  voided: 'error',
}

const columns: TableColumn<RecentOrder>[] = [
  {
    accessorKey: 'number',
    header: 'Order',
    cell: ({ row }) =>
      page.props.permissions.manageStore
        ? h(
            ULink,
            {
              to: urlFor('seller.orders.show', { id: row.original.id }),
              class: 'font-medium text-highlighted hover:underline',
            },
            () => row.original.number
          )
        : row.original.number,
  },
  {
    accessorKey: 'processedAt',
    header: 'Date',
    cell: ({ row }) => orderDate(row.original.processedAt),
  },
  {
    accessorKey: 'financialStatus',
    header: 'Payment',
    cell: ({ row }) =>
      h(
        UBadge,
        {
          variant: 'subtle',
          color: statusColors[row.original.financialStatus] ?? 'neutral',
        },
        () => orderLabel(row.original.financialStatus)
      ),
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'totalAmount',
    header: () => h('div', { class: 'text-right' }, 'Total'),
    cell: ({ row }) =>
      h(
        'div',
        { class: 'text-right font-medium' },
        orderMoney(row.original.totalAmount, row.original.currencyCode)
      ),
  },
]
</script>

<template>
  <UTable
    :data="orders"
    :columns="columns"
    empty="No orders in this period."
    class="shrink-0"
    :ui="{
      base: 'table-fixed border-separate border-spacing-0',
      thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
      tbody: '[&>tr]:last:[&>td]:border-b-0',
      th: 'first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
      td: 'border-b border-default',
    }"
  />
</template>

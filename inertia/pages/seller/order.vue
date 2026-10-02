<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import StatusForm from '~/components/seller/orders/StatusForm.vue'
import type { Data } from '@generated/data'
import type { TableColumn } from '@nuxt/ui'
const props = defineProps<{ order: Data.Seller.Order }>()
const money = (amount: number) =>
  new Intl.NumberFormat('en', { style: 'currency', currency: props.order.currencyCode }).format(
    amount
  )
const columns: TableColumn<Data.Checkout.OrderLineItem>[] = [
  { accessorKey: 'title', header: 'Product' },
  { accessorKey: 'variantTitle', header: 'Variant' },
  { accessorKey: 'sku', header: 'SKU' },
  { accessorKey: 'quantity', header: 'Quantity' },
  {
    accessorKey: 'unitPriceAmount',
    header: 'Unit price',
    cell: ({ row }) => money(row.original.unitPriceAmount),
  },
  {
    accessorKey: 'totalAmount',
    header: 'Total',
    cell: ({ row }) => money(row.original.totalAmount),
  },
]
</script>

<template>
  <Head :title="`Order ${order.number}`" />
  <UDashboardPanel id="order">
    <template #header
      ><UDashboardNavbar :title="order.number"
        ><template #leading><UDashboardSidebarCollapse /></template></UDashboardNavbar
    ></template>
    <template #body>
      <Link
        route="seller.orders.index"
        class="inline-flex items-center gap-1 text-sm text-primary w-fit"
        ><UIcon name="i-lucide-arrow-left" class="size-4" />Orders</Link
      >
      <div class="grid xl:grid-cols-3 gap-6 items-start">
        <div class="xl:col-span-2 space-y-6 min-w-0">
          <UCard
            ><template #header><h2 class="font-semibold text-highlighted">Items</h2></template
            ><UTable :data="order.lineItems || []" :columns="columns"
          /></UCard>
          <UCard
            ><template #header
              ><h2 class="font-semibold text-highlighted">Order totals</h2></template
            >
            <dl class="space-y-3 text-sm">
              <div
                v-for="item in [
                  { label: 'Subtotal', amount: order.subtotalAmount },
                  { label: 'Discount', amount: -order.discountAmount },
                  { label: 'Shipping', amount: order.shippingAmount },
                  { label: 'Tax', amount: order.taxAmount },
                ]"
                :key="item.label"
                class="flex justify-between gap-4"
              >
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
          </UCard>
          <div class="grid sm:grid-cols-2 gap-6">
            <UCard v-for="address in order.addresses" :key="address.id"
              ><template #header
                ><h2 class="font-semibold text-highlighted capitalize">
                  {{ address.type }} address
                </h2></template
              >
              <p v-for="(line, index) in address.formatted" :key="index" class="text-sm">
                {{ line }}
              </p>
              <p v-if="address.phoneNumber" class="text-sm mt-2">
                {{ address.phoneNumber }}
              </p></UCard
            >
          </div>
        </div>
        <div class="space-y-6 min-w-0">
          <UCard
            ><template #header><h2 class="font-semibold text-highlighted">Customer</h2></template>
            <p class="text-sm break-all">{{ order.email }}</p>
            <p v-if="order.phoneNumber" class="text-sm mt-2">{{ order.phoneNumber }}</p>
            <p class="text-sm text-muted mt-3">
              {{ order.processedAt ? new Date(order.processedAt).toLocaleString() : '—' }}
            </p>
            <UBadge
              v-if="order.cancelledAt"
              label="Cancelled"
              color="error"
              variant="subtle"
              class="mt-3"
          /></UCard>
          <UCard
            ><template #header
              ><h2 class="font-semibold text-highlighted">Manage order</h2></template
            >
            <StatusForm :order="order" />
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import StatusForm from '~/components/seller/orders/StatusForm.vue'
import WorkflowPanel from '~/components/seller/orders/WorkflowPanel.vue'
import type { Data } from '@generated/data'
import type { TableColumn } from '@nuxt/ui'
const props = defineProps<{ order: Data.Seller.Order }>()
const refreshing = ref(false)
const refresh = () =>
  router.reload({
    only: ['order'],
    onStart: () => {
      refreshing.value = true
    },
    onFinish: () => {
      refreshing.value = false
    },
  })
const label = (value: string) =>
  value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())
const money = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: props.order.currencyCode }).format(
    amount
  )
const quantity = computed(
  () => props.order.lineItems?.reduce((total, item) => total + item.quantity, 0) || 0
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
  <UDashboardPanel id="order" :ui="{ body: 'gap-8 sm:gap-8' }">
    <template #header>
      <UDashboardNavbar :title="order.number">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right
          ><UButton
            label="Refresh status"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="outline"
            :loading="refreshing"
            :disabled="refreshing"
            @click="refresh"
        /></template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <header>
        <Link
          route="seller.orders.index"
          class="inline-flex items-center gap-1 text-sm text-primary w-fit mb-4"
          ><UIcon name="i-lucide-arrow-left" class="size-4" />Orders</Link
        >
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0">
            <h1 class="text-2xl font-semibold text-highlighted">Order {{ order.number }}</h1>
            <p class="text-sm text-muted mt-2">
              {{ quantity }} {{ quantity === 1 ? 'item' : 'items'
              }}<span v-if="order.processedAt">
                · Placed {{ new Date(order.processedAt).toLocaleString() }}</span
              >
            </p>
            <div class="flex flex-wrap gap-2 mt-3">
              <UBadge
                v-if="order.source === 'online'"
                class="text-default"
                :label="label(order.lifecycleState)"
                :color="order.lifecycleState === 'review_required' ? 'warning' : 'neutral'"
                variant="subtle"
              />
              <UBadge
                class="text-default"
                :label="label(order.financialStatus)"
                :color="order.financialStatus === 'paid' ? 'success' : 'neutral'"
                variant="subtle"
              />
              <UBadge
                class="text-default"
                :label="label(order.fulfillmentStatus)"
                color="neutral"
                variant="subtle"
              />
              <UBadge
                v-if="order.cancelledAt"
                class="text-default"
                label="Cancelled"
                color="error"
                variant="subtle"
              />
            </div>
          </div>
          <div class="sm:text-right">
            <p class="text-lg font-semibold text-highlighted tabular-nums">
              {{ money(order.totalAmount) }}
            </p>
            <p class="text-sm text-muted mt-1">
              {{ order.source === 'online' ? 'Online checkout' : 'Manual order' }}
            </p>
          </div>
        </div>
      </header>

      <WorkflowPanel v-if="order.source === 'online'" :order="order" />
      <section
        v-else
        aria-labelledby="manual-order-title"
        class="rounded-lg bg-elevated/50 p-5 sm:p-6"
      >
        <h2 id="manual-order-title" class="text-xl font-semibold text-highlighted">
          Record payment and fulfillment
        </h2>
        <p class="text-sm text-muted mt-2 mb-5 max-w-prose">
          This manual order has no hosted payment or shipment workflow. Record the payment and
          fulfillment outcome here as work is completed.
        </p>
        <div class="max-w-xl"><StatusForm :order="order" /></div>
      </section>

      <div
        class="grid gap-8 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] border-t border-default pt-8"
      >
        <div class="min-w-0 space-y-8">
          <section aria-labelledby="order-items-title">
            <div class="flex items-center justify-between mb-3 gap-3">
              <h2 id="order-items-title" class="text-lg font-semibold text-highlighted">
                Order contents
              </h2>
              <span class="text-sm text-muted"
                >{{ quantity }} {{ quantity === 1 ? 'item' : 'items' }}</span
              >
            </div>
            <UTable
              :data="order.lineItems || []"
              :columns="columns"
              :ui="{ td: 'tabular-nums', th: 'text-xs' }"
            />
            <dl class="ml-auto w-full sm:max-w-xs mt-5 space-y-2 text-sm tabular-nums">
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
          </section>
          <section
            v-if="order.source === 'online'"
            aria-labelledby="order-notes-title"
            class="border-t border-default pt-6"
          >
            <h2 id="order-notes-title" class="text-lg font-semibold text-highlighted mb-3">
              Order note
            </h2>
            <div class="max-w-xl"><StatusForm :order="order" /></div>
          </section>
        </div>
        <aside
          aria-labelledby="order-customer-title"
          class="min-w-0 space-y-6 xl:border-l xl:border-default xl:pl-8"
        >
          <section>
            <h2 id="order-customer-title" class="text-lg font-semibold text-highlighted">
              Customer &amp; delivery
            </h2>
            <p class="text-sm mt-3 break-all">{{ order.email }}</p>
            <p v-if="order.phoneNumber" class="text-sm mt-1">{{ order.phoneNumber }}</p>
          </section>
          <section
            v-for="address in order.addresses"
            :key="address.id"
            class="border-t border-default pt-5"
          >
            <h3 class="text-sm font-semibold text-highlighted capitalize mb-2">
              {{ address.type }} address
            </h3>
            <p v-for="(line, index) in address.formatted" :key="index" class="text-sm break-words">
              {{ line }}
            </p>
            <p v-if="address.phoneNumber" class="text-sm mt-2">{{ address.phoneNumber }}</p>
          </section>
          <p v-if="!order.addresses?.length" class="text-sm text-muted">
            No address is recorded for this order.
          </p>
        </aside>
      </div>
    </template>
  </UDashboardPanel>
</template>

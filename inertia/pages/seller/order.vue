<script setup lang="ts">
import { computed, ref } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import StatusForm from '~/components/seller/orders/StatusForm.vue'
import WorkflowPanel from '~/components/seller/orders/WorkflowPanel.vue'
import { provideOrderInteraction } from '~/components/seller/orders/interaction'
import { orderDate, orderLabel, orderMoney } from '~/components/seller/orders/presentation'
import type { Data } from '@generated/data'
import type { TableColumn } from '@nuxt/ui'
const props = defineProps<{
  order: Data.Seller.Order
  operations: Data.Seller.OrderOperations | null
}>()
const { busy, error, uncertain, announcement, requestOptions } = provideOrderInteraction()
const refreshing = ref(false)
const refresh = () =>
  router.reload({
    only: ['order', 'operations'],
    onBefore: () => {
      if (busy.value) return false
    },
    onStart: () => {
      refreshing.value = true
      busy.value = true
    },
    onFinish: () => {
      refreshing.value = false
      busy.value = false
    },
    onSuccess: () => {
      error.value = ''
      uncertain.value = false
    },
    onHttpException: requestOptions.onHttpException,
    onNetworkError: requestOptions.onNetworkError,
  })
const label = orderLabel
// Online orders show only lifecycle states the fulfillment strip cannot express.
const showBadges = computed(
  () =>
    props.order.source !== 'online' ||
    ['review_required', 'cancelled', 'expired'].includes(props.order.lifecycleState)
)
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
  <Head :title="`Order ${order.number}`" />
  <UDashboardPanel
    id="order"
    class="[--ui-primary:var(--ui-color-primary-700)] [--ui-warning:var(--ui-color-warning-700)] [--ui-error:var(--ui-color-error-700)] dark:[--ui-primary:var(--ui-color-primary-400)] dark:[--ui-warning:var(--ui-color-warning-400)] dark:[--ui-error:var(--ui-color-error-400)] [&_.bg-primary:hover]:bg-primary-800 dark:[&_.bg-primary:hover]:bg-primary/75"
    :ui="{ body: 'gap-8 sm:gap-8' }"
  >
    <template #header>
      <UDashboardNavbar title="Order details">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right
          ><UButton
            label="Refresh status"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="outline"
            :loading="refreshing"
            :disabled="busy"
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
            <h1 class="text-2xl font-semibold text-highlighted [overflow-wrap:anywhere]">
              Order {{ order.number }}
            </h1>
            <p class="text-sm text-muted mt-2">
              {{ quantity }} {{ quantity === 1 ? 'item' : 'items'
              }}<span v-if="order.processedAt">
                · Placed {{ orderDate(order.processedAt) }} (Philippine time)</span
              >
            </p>
            <div v-if="showBadges" class="flex flex-wrap gap-2 mt-3">
              <UBadge
                v-if="order.source === 'online'"
                class="text-default"
                :label="label(order.lifecycleState)"
                :color="
                  order.lifecycleState === 'review_required'
                    ? 'warning'
                    : ['cancelled', 'expired'].includes(order.lifecycleState)
                      ? 'error'
                      : 'neutral'
                "
                variant="subtle"
              />
              <template v-else>
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
              </template>
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

      <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>
      <div
        v-if="error"
        role="alert"
        class="rounded-lg bg-elevated/50 p-4 sm:p-5 border border-error/40"
      >
        <p class="font-semibold text-highlighted">
          {{ uncertain ? 'Check status before continuing' : 'Action needs attention' }}
        </p>
        <p class="text-sm text-default mt-2 [overflow-wrap:anywhere]">{{ error }}</p>
        <UButton
          label="Refresh status"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          class="mt-3"
          :loading="refreshing"
          :disabled="busy"
          @click="refresh"
        />
      </div>
      <WorkflowPanel
        v-if="order.source === 'online' && operations"
        :order="order"
        :operations="operations"
      />
      <p v-else-if="order.source === 'online'" role="status" class="text-default">
        Order actions are unavailable. Refresh status before continuing.
      </p>
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
              v-if="order.lineItems?.length"
              :data="order.lineItems || []"
              :columns="columns"
              class="hidden sm:block"
              :ui="{ td: 'tabular-nums align-top', th: 'text-sm' }"
            >
              <template #title-cell="{ row }"
                ><div class="min-w-48 whitespace-normal [overflow-wrap:anywhere]">
                  <p class="font-medium text-highlighted">{{ row.original.title }}</p>
                  <p v-if="row.original.variantTitle" class="mt-1 text-sm text-muted">
                    {{ row.original.variantTitle }}
                  </p>
                  <p v-if="row.original.sku" class="mt-1 text-sm text-muted">
                    SKU: <bdi>{{ row.original.sku }}</bdi>
                  </p>
                  <p class="mt-3 text-sm">Unit price: {{ money(row.original.unitPriceAmount) }}</p>
                </div></template
              >
            </UTable>
            <ul v-if="order.lineItems?.length" class="divide-y divide-default sm:hidden">
              <li v-for="item in order.lineItems" :key="item.id" class="py-4 first:pt-0">
                <p class="font-medium text-highlighted [overflow-wrap:anywhere]">
                  {{ item.title }}
                </p>
                <p
                  v-if="item.variantTitle"
                  class="text-sm text-muted mt-1 [overflow-wrap:anywhere]"
                >
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
            <p class="text-sm mt-3 [overflow-wrap:anywhere]">
              <bdi>{{ order.email || 'No email recorded' }}</bdi>
            </p>
            <p v-if="order.phoneNumber" class="text-sm mt-1 [overflow-wrap:anywhere]">
              <bdi>{{ order.phoneNumber }}</bdi>
            </p>
          </section>
          <section
            v-for="address in order.addresses"
            :key="address.id"
            class="border-t border-default pt-5"
          >
            <h3 class="text-sm font-semibold text-highlighted mb-2">
              {{ label(address.type) }} address
            </h3>
            <p
              v-for="(line, index) in address.formatted"
              :key="index"
              class="text-sm [overflow-wrap:anywhere]"
            >
              {{ line }}
            </p>
            <p v-if="address.phoneNumber" class="text-sm mt-2 [overflow-wrap:anywhere]">
              <bdi>{{ address.phoneNumber }}</bdi>
            </p>
          </section>
          <p v-if="!order.addresses?.length" class="text-sm text-muted">
            No address is recorded for this order.
          </p>
        </aside>
      </div>
    </template>
  </UDashboardPanel>
</template>

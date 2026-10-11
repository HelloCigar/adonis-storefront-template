<script setup lang="ts">
import { computed, ref } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import BackButton from '~/components/seller/BackButton.vue'
import StatusForm from '~/components/seller/orders/StatusForm.vue'
import WorkflowPanel from '~/components/seller/orders/WorkflowPanel.vue'
import OrderContents from '~/components/seller/orders/OrderContents.vue'
import CustomerDetails from '~/components/seller/orders/CustomerDetails.vue'
import OrderNote from '~/components/seller/orders/OrderNote.vue'
import NextStep from '~/components/seller/orders/NextStep.vue'
import { provideOrderInteraction } from '~/components/seller/orders/interaction'
import { orderDate, orderMoney } from '~/components/seller/orders/presentation'
import { statusColor, statusLabel } from '~/utils/status'
import type { Data } from '@generated/data'
import { urlFor } from '~/client'
const props = defineProps<{
  order: Data.Seller.Order
  operations: Data.Seller.OrderOperations | null
  /** Present only for account orders, which have a chat with their customer. */
  chat: { unreadCount: number } | null
  queue: Data.Seller.OrderQueueItem
}>()
const { busy, error, uncertain, announcement, requestOptions } = provideOrderInteraction()
const refreshing = ref(false)
const refresh = () =>
  router.reload({
    only: ['order', 'operations', 'queue'],
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
const money = (amount: number) => orderMoney(amount, props.order.currencyCode)
const quantity = computed(
  () => props.order.lineItems?.reduce((total, item) => total + item.quantity, 0) || 0
)
/** Lead with the state staff act on: the queue stage, or a closed or review state it lacks. */
const badges = computed(() => {
  const { order, queue } = props
  if (order.source !== 'online')
    return [
      {
        label: statusLabel('payment', order.financialStatus),
        color: statusColor('payment', order.financialStatus),
      },
      {
        label: statusLabel('fulfillment', order.fulfillmentStatus),
        color: statusColor('fulfillment', order.fulfillmentStatus),
      },
      ...(order.cancelledAt ? [{ label: 'Cancelled', color: 'error' as const }] : []),
    ]
  if (['review_required', 'cancelled', 'expired'].includes(order.lifecycleState))
    return [
      {
        label: statusLabel('order', order.lifecycleState),
        color: statusColor('order', order.lifecycleState),
      },
    ]
  const stages: string[] = queue.stages.length
    ? queue.stages
    : queue.nextStep === 'await_payment'
      ? ['awaiting_payment']
      : []
  return stages.map((stage) => ({
    label: statusLabel('stage', stage),
    color: statusColor('stage', stage),
  }))
})
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
        <template #leading>
          <UDashboardSidebarCollapse />
          <BackButton :to="urlFor('seller.orders.index')" label="orders" />
        </template>
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
      <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 class="text-2xl font-semibold text-highlighted [overflow-wrap:anywhere]">
              Order {{ order.number }}
            </h1>
            <UBadge
              v-for="badge in badges"
              :key="badge.label"
              class="text-default"
              :label="badge.label"
              :color="badge.color"
              variant="subtle"
              size="lg"
            />
          </div>
          <p class="text-sm text-muted mt-2">
            <span class="font-medium text-highlighted tabular-nums">{{
              money(order.totalAmount)
            }}</span>
            · {{ quantity }} {{ quantity === 1 ? 'item' : 'items' }} ·
            {{ order.source === 'online' ? 'Online checkout' : 'Manual order'
            }}<span v-if="order.processedAt">
              · Placed {{ orderDate(order.processedAt) }} (Philippine time)</span
            >
          </p>
          <p v-if="order.source !== 'online'" class="mt-3 flex items-center gap-2 text-sm">
            <span class="text-muted">Next step</span>
            <NextStep :step="queue.nextStep" :waiting-since="queue.waitingSince" />
          </p>
        </div>
        <UButton
          v-if="chat"
          :to="urlFor('inbox', {}, { qs: { order: order.id } })"
          icon="i-lucide-message-circle"
          label="Message customer"
          color="neutral"
          variant="outline"
          class="shrink-0 self-start"
        >
          <template v-if="chat.unreadCount" #trailing>
            <UBadge
              :label="chat.unreadCount"
              size="sm"
              :aria-label="`${chat.unreadCount} unread`"
            />
          </template>
        </UButton>
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
        :waiting-since="queue.waitingSince"
      >
        <template #contents
          ><OrderContents :order="order" class="border-t border-default pt-6"
        /></template>
        <template #aside>
          <CustomerDetails :order="order" />
          <OrderNote :order="order" editable class="border-t border-default pt-6" />
        </template>
      </WorkflowPanel>
      <div v-else class="grid gap-8 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div class="min-w-0 space-y-8">
          <p v-if="order.source === 'online'" role="status" class="text-default">
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
          <OrderContents :order="order" class="border-t border-default pt-6" />
        </div>
        <aside class="min-w-0 space-y-8 xl:border-l xl:border-default xl:pl-8">
          <CustomerDetails :order="order" />
          <!-- Manual orders edit the note in the form above; only an unavailable online workflow needs it here. -->
          <OrderNote
            v-if="order.source === 'online'"
            :order="order"
            editable
            class="border-t border-default pt-6"
          />
        </aside>
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Data } from '@generated/data'
import { orderDate, orderMoney } from './presentation'
import { useOrderInteraction } from './interaction'
import { statusColor, statusLabel } from '~/utils/status'
import { urlFor } from '~/client'

const props = defineProps<{
  order: Data.Seller.Order
  queue: Data.Seller.OrderQueueItem
  chat: { unreadCount: number } | null
  refreshing: boolean
}>()
const emit = defineEmits<{ refresh: [] }>()
const { busy } = useOrderInteraction()

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
          orderMoney(order.totalAmount, order.currencyCode)
        }}</span>
        · {{ quantity }} {{ quantity === 1 ? 'item' : 'items' }} ·
        {{ order.source === 'online' ? 'Online checkout' : 'Manual order'
        }}<span v-if="order.processedAt">
          · Placed {{ orderDate(order.processedAt) }} (Philippine time)</span
        >
      </p>
    </div>
    <div class="flex flex-wrap items-center gap-2 shrink-0">
      <UButton
        v-if="chat"
        :to="urlFor('inbox', {}, { qs: { order: order.id } })"
        icon="i-lucide-message-circle"
        label="Message customer"
        color="neutral"
        variant="outline"
      >
        <template v-if="chat.unreadCount" #trailing>
          <UBadge :label="chat.unreadCount" size="sm" :aria-label="`${chat.unreadCount} unread`" />
        </template>
      </UButton>
      <UButton
        label="Refresh status"
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="outline"
        :loading="refreshing"
        :disabled="busy"
        @click="emit('refresh')"
      />
      <slot name="actions" />
    </div>
  </header>
</template>

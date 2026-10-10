<script setup lang="ts">
import { computed } from 'vue'
import type { Data } from '@generated/data'
import { urlFor } from '~/client'
import OrderChat from '~/components/chat/OrderChat.vue'
import { stagePresentation } from '~/components/inbox/stage'
import { orderMoney } from '~/components/seller/orders/presentation'

const props = defineProps<{
  thread: Data.Chat.Thread
  conversation: Data.Chat.Conversation | null
}>()

const emits = defineEmits<{ close: [] }>()

const stage = computed(() => stagePresentation[props.thread.stage])
const total = computed(() => orderMoney(props.thread.totalAmount, props.thread.currencyCode))
</script>

<template>
  <UDashboardPanel id="inbox-2">
    <UDashboardNavbar :title="`Order ${thread.orderNumber}`" :toggle="false">
      <template #leading>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          class="-ms-1.5"
          aria-label="Close conversation"
          @click="emits('close')"
        />
      </template>

      <template #trailing>
        <UBadge :label="stage.label" :color="stage.color" variant="subtle" class="shrink-0" />
      </template>

      <template #right>
        <span class="hidden xl:inline text-sm text-muted tabular-nums">{{ total }}</span>
        <UButton
          :to="urlFor('seller.orders.show', { id: thread.orderId })"
          icon="i-lucide-arrow-up-right"
          trailing
          color="neutral"
          variant="outline"
          :aria-label="`View order ${thread.orderNumber}`"
        >
          <span class="hidden sm:inline">View order</span>
        </UButton>
      </template>
    </UDashboardNavbar>

    <OrderChat
      v-if="conversation && conversation.orderId === thread.orderId"
      :conversation="conversation"
      side="staff"
      :customer-name="thread.customerName"
    />
    <div v-else class="flex flex-1 items-center justify-center">
      <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-dimmed" />
    </div>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import BackButton from '~/components/seller/BackButton.vue'
import OrderHeader from '~/components/seller/orders/OrderHeader.vue'
import OrderActionsMenu from '~/components/seller/orders/OrderActionsMenu.vue'
import RefundModal from '~/components/seller/orders/RefundModal.vue'
import CancelModal from '~/components/seller/orders/CancelModal.vue'
import ActionAlert from '~/components/seller/orders/ActionAlert.vue'
import NextAction from '~/components/seller/orders/NextAction.vue'
import ManualOrderStep from '~/components/seller/orders/ManualOrderStep.vue'
import FailedEmailAlert from '~/components/seller/orders/FailedEmailAlert.vue'
import OrderContents from '~/components/seller/orders/OrderContents.vue'
import PaymentSummary from '~/components/seller/orders/PaymentSummary.vue'
import OrderTimeline from '~/components/seller/orders/OrderTimeline.vue'
import CustomerDetails from '~/components/seller/orders/CustomerDetails.vue'
import OrderNote from '~/components/seller/orders/OrderNote.vue'
import { provideOrderInteraction } from '~/components/seller/orders/interaction'
import type { Data } from '@generated/data'
import { urlFor } from '~/client'
defineProps<{
  order: Data.Seller.Order
  operations: Data.Seller.OrderOperations | null
  /** Present only for account orders, which have a chat with their customer. */
  chat: { unreadCount: number } | null
  queue: Data.Seller.OrderQueueItem
}>()
const { busy, error, uncertain, announcement, requestOptions } = provideOrderInteraction()
const refreshing = ref(false)
const refundOpen = ref(false)
const cancelOpen = ref(false)
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
      </UDashboardNavbar>
    </template>
    <template #body>
      <OrderHeader
        :order="order"
        :queue="queue"
        :chat="chat"
        :refreshing="refreshing"
        @refresh="refresh"
      >
        <template v-if="order.source === 'online' && operations" #actions>
          <OrderActionsMenu
            :order="order"
            :operations="operations"
            @refund="refundOpen = true"
            @cancel="cancelOpen = true"
          />
        </template>
      </OrderHeader>
      <CancelModal
        v-if="order.source === 'online' && operations"
        v-model:open="cancelOpen"
        :order="order"
        :operations="operations"
      />
      <RefundModal
        v-if="order.source === 'online' && operations"
        v-model:open="refundOpen"
        :order="order"
        :operations="operations"
      />
      <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>
      <ActionAlert :refreshing="refreshing" @refresh="refresh" />

      <div class="grid gap-8 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div class="min-w-0 space-y-8">
          <NextAction
            v-if="order.source === 'online' && operations"
            :order="order"
            :operations="operations"
            :waiting-since="queue.waitingSince"
          />
          <ManualOrderStep v-else-if="order.source !== 'online'" :order="order" :queue="queue" />
          <p v-else role="status" class="text-default">
            Order actions are unavailable. Refresh status before continuing.
          </p>
          <FailedEmailAlert :order="order" />
          <OrderContents :order="order" />
          <PaymentSummary
            v-if="order.source === 'online' && operations"
            :order="order"
            :operations="operations"
          />
          <OrderTimeline :order="order" />
        </div>
        <aside class="min-w-0 space-y-8 xl:border-l xl:border-default xl:pl-8">
          <CustomerDetails :order="order" />
          <!-- Manual orders edit the note in the form above, so it is editable in one place only. -->
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

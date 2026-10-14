<script setup lang="ts">
import { computed } from 'vue'
import type { Data } from '@generated/data'
import { orderLabel, operationMessage } from './presentation'
import EmailRetryForm from './EmailRetryForm.vue'

const props = defineProps<{ order: Data.Seller.Order }>()
const failed = computed(() =>
  props.order.notifications.filter((notification) => notification.state === 'failed')
)
</script>

<template>
  <div
    v-if="failed.length"
    role="alert"
    class="rounded-lg border border-warning/40 bg-elevated/50 p-4 sm:p-5"
  >
    <ul class="space-y-4">
      <li
        v-for="notification in failed"
        :key="notification.id"
        class="flex flex-wrap items-start justify-between gap-3"
      >
        <div class="flex min-w-0 gap-2.5">
          <UIcon
            name="i-lucide-mail-warning"
            class="size-5 shrink-0 mt-0.5 text-warning"
            aria-hidden="true"
          />
          <div class="min-w-0">
            <p class="font-semibold text-highlighted">
              {{ orderLabel(notification.kind) }} email failed
            </p>
            <p v-if="notification.lastError" class="text-sm text-default mt-1 break-words">
              {{ operationMessage(notification.lastError, 'notification') }}
            </p>
          </div>
        </div>
        <EmailRetryForm
          :order-id="order.id"
          :notification-id="notification.id"
          :kind="notification.kind"
          class="shrink-0"
        />
      </li>
    </ul>
  </div>
</template>

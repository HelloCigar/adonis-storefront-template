<script setup lang="ts">
import type { Data } from '@generated/data'
import OrderChat from '~/components/chat/OrderChat.vue'

defineProps<{
  thread: Data.Chat.Thread
  conversation: Data.Chat.Conversation | null
}>()

const emits = defineEmits<{ close: [] }>()

// Placeholder actions, kept for thread tools that are not built yet.
const dropdownItems = [
  [
    {
      label: 'Mark as unread',
      icon: 'i-lucide-check-circle',
    },
    {
      label: 'Mark as important',
      icon: 'i-lucide-triangle-alert',
    },
  ],
  [
    {
      label: 'Star thread',
      icon: 'i-lucide-star',
    },
    {
      label: 'Mute thread',
      icon: 'i-lucide-circle-pause',
    },
  ],
]
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

      <template #right>
        <UTooltip text="Archive">
          <UButton icon="i-lucide-inbox" color="neutral" variant="ghost" aria-label="Archive" />
        </UTooltip>

        <UTooltip text="Reply">
          <UButton icon="i-lucide-reply" color="neutral" variant="ghost" aria-label="Reply" />
        </UTooltip>

        <UDropdownMenu :items="dropdownItems">
          <UButton
            icon="i-lucide-ellipsis-vertical"
            color="neutral"
            variant="ghost"
            aria-label="More actions"
          />
        </UDropdownMenu>
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

<script setup lang="ts">
import { ref, watch } from 'vue'
import { format, isToday } from 'date-fns'
import type { Data } from '@generated/data'

const props = defineProps<{
  threads: Data.Chat.Thread[]
}>()

const threadsRefs = ref<Record<number, Element | null>>({})

const selectedThread = defineModel<Data.Chat.Thread | null>()

watch(selectedThread, () => {
  if (!selectedThread.value) {
    return
  }
  const el = threadsRefs.value[selectedThread.value.orderId]
  if (el) {
    el.scrollIntoView({ block: 'nearest' })
  }
})

defineShortcuts({
  arrowdown: () => {
    const index = props.threads.findIndex(
      (thread) => thread.orderId === selectedThread.value?.orderId
    )

    if (index === -1) {
      selectedThread.value = props.threads[0]
    } else if (index < props.threads.length - 1) {
      selectedThread.value = props.threads[index + 1]
    }
  },
  arrowup: () => {
    const index = props.threads.findIndex(
      (thread) => thread.orderId === selectedThread.value?.orderId
    )

    if (index === -1) {
      selectedThread.value = props.threads[props.threads.length - 1]
    } else if (index > 0) {
      selectedThread.value = props.threads[index - 1]
    }
  },
})

function when(thread: Data.Chat.Thread) {
  const date = new Date(thread.lastMessage?.createdAt ?? thread.placedAt)
  return isToday(date) ? format(date, 'HH:mm') : format(date, 'dd MMM')
}

function preview(thread: Data.Chat.Thread) {
  const message = thread.lastMessage
  if (!message) return 'No messages yet'
  return message.senderRole === 'staff' ? `${message.senderName}: ${message.body}` : message.body
}
</script>

<template>
  <div class="overflow-y-auto divide-y divide-default">
    <div
      v-for="thread in threads"
      :key="thread.orderId"
      :ref="
        (el) => {
          threadsRefs[thread.orderId] = el as Element | null
        }
      "
    >
      <div
        class="p-4 sm:px-6 text-sm cursor-pointer border-l-2 transition-colors"
        :class="[
          thread.unreadCount ? 'text-highlighted' : 'text-toned',
          selectedThread && selectedThread.orderId === thread.orderId
            ? 'border-primary bg-primary/10'
            : 'border-bg hover:border-primary hover:bg-primary/5',
        ]"
        @click="selectedThread = thread"
      >
        <div
          class="flex items-center justify-between gap-3"
          :class="[thread.unreadCount && 'font-semibold']"
        >
          <div class="flex items-center gap-3 min-w-0">
            <span class="truncate">{{ thread.customerName }}</span>

            <UChip v-if="thread.unreadCount" />
          </div>

          <span class="shrink-0">{{ when(thread) }}</span>
        </div>
        <p class="truncate" :class="[thread.unreadCount && 'font-semibold']">
          Order {{ thread.orderNumber }}
        </p>
        <p class="text-dimmed line-clamp-1">
          {{ preview(thread) }}
        </p>
      </div>
    </div>
  </div>
</template>

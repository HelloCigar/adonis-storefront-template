<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Head, router, usePoll } from '@inertiajs/vue3'
import { useBreakpoints, breakpointsTailwind } from '@vueuse/core'
import type { Data } from '@generated/data'

const props = defineProps<{
  filter: 'all' | 'unread'
  threads: Data.Chat.Thread[]
  openThread: Data.Chat.Thread | null
  conversation: Data.Chat.Conversation | null
}>()

const tabItems = [
  {
    label: 'All',
    value: 'all',
  },
  {
    label: 'Unread',
    value: 'unread',
  },
]

// Opened threads are read on the server; show that before the next list refresh.
const opened = ref(new Set<string>(props.conversation ? [props.conversation.orderId] : []))
const threads = computed(() =>
  props.threads.map((thread) =>
    opened.value.has(thread.orderId) ? { ...thread, unreadCount: 0 } : thread
  )
)

// A linked order opens even when the list leaves it out, such as an older order.
const selectedThread = ref<Data.Chat.Thread | null>(
  props.threads.find((thread) => thread.orderId === props.conversation?.orderId) ??
    (props.conversation ? props.openThread : null)
)

// The header follows list refreshes, so a newly packed order shows its new step.
const headerThread = computed(
  () =>
    threads.value.find((thread) => thread.orderId === selectedThread.value?.orderId) ??
    selectedThread.value
)

const selectedTab = computed({
  get: () => props.filter,
  set: (filter: string) => router.reload({ only: ['filter', 'threads'], data: { filter } }),
})

watch(
  () => selectedThread.value?.orderId,
  (orderId) => {
    if (!orderId || orderId === props.conversation?.orderId) return
    opened.value = new Set(opened.value).add(orderId)
    router.reload({ only: ['conversation'], data: { order: orderId } })
  }
)

// Keep thread previews and unread markers current; the open thread updates live.
watch(
  () => props.threads,
  () => (opened.value = new Set(selectedThread.value ? [selectedThread.value.orderId] : []))
)
usePoll(15_000, { only: ['threads'] })

const isMailPanelOpen = computed({
  get() {
    return !!selectedThread.value
  },
  set(value: boolean) {
    if (!value) {
      selectedThread.value = null
    }
  },
})

const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('lg')
</script>

<template>
  <Head title="Inbox" />
  <UDashboardPanel id="inbox-1" :default-size="25" :min-size="20" :max-size="30" resizable>
    <UDashboardNavbar title="Inbox">
      <template #leading>
        <UDashboardSidebarCollapse />
      </template>
      <template #trailing>
        <UBadge :label="threads.length" variant="subtle" />
      </template>

      <template #right>
        <UTabs v-model="selectedTab" :items="tabItems" :content="false" size="xs" />
      </template>
    </UDashboardNavbar>

    <InboxList v-if="threads.length" v-model="selectedThread" :threads="threads" />
    <UEmpty
      v-else
      icon="i-lucide-inbox"
      :title="filter === 'unread' ? 'All caught up' : 'No conversations yet'"
      :description="
        filter === 'unread'
          ? 'Customer messages you haven’t opened will show here.'
          : 'Confirmed orders placed with a customer account appear here.'
      "
      variant="naked"
      class="flex-1"
    />
  </UDashboardPanel>

  <InboxMail
    v-if="headerThread && !isMobile"
    :thread="headerThread"
    :conversation="conversation"
    @close="selectedThread = null"
  />
  <div v-else-if="!isMobile" class="hidden lg:flex flex-1 items-center justify-center">
    <UIcon name="i-lucide-inbox" class="size-32 text-dimmed" />
  </div>

  <USlideover v-if="isMobile" v-model:open="isMailPanelOpen">
    <template #content>
      <InboxMail
        v-if="headerThread"
        :thread="headerThread"
        :conversation="conversation"
        @close="selectedThread = null"
      />
    </template>
  </USlideover>
</template>

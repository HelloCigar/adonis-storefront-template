<script setup lang="ts">
import { useDashboardCopilot } from '~/composables/dashboardCopilot'

const { pastConversations, openPast } = useDashboardCopilot()
</script>

<template>
  <div class="flex h-full flex-col gap-2 overflow-y-auto">
    <p class="text-sm font-medium text-highlighted">Past conversations</p>
    <p class="text-xs text-muted">
      Kept for 90 days after their last message. They record changes made to the store, so they
      can't be deleted.
    </p>
    <UEmpty
      v-if="!pastConversations.length"
      icon="i-lucide-messages-square"
      title="No past conversations"
      description="Conversations you have with the copilot appear here."
    />
    <ul v-else class="flex flex-col divide-y divide-default">
      <li
        v-for="conversation in pastConversations"
        :key="conversation.id"
        class="flex items-center gap-2 py-1"
      >
        <UButton
          :label="conversation.title"
          color="neutral"
          variant="ghost"
          class="min-w-0 flex-1 justify-start"
          :ui="{ label: 'truncate' }"
          @click="openPast(conversation.id)"
        />
        <span class="shrink-0 text-xs text-muted">{{ conversation.lastMessageAt.formatted }}</span>
      </li>
    </ul>
  </div>
</template>

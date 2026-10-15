<script setup lang="ts">
import { useShoppingAssistant } from '~/composables/shoppingAssistant'

const { pastConversations, openPast, remove } = useShoppingAssistant()
</script>

<template>
  <div class="flex h-full flex-col gap-2 overflow-y-auto">
    <p class="text-sm font-medium text-highlighted">Past conversations</p>
    <UEmpty
      v-if="!pastConversations.length"
      icon="i-lucide-messages-square"
      title="No past conversations"
      description="Conversations you have while signed in appear here."
    />
    <ul v-else class="flex flex-col divide-y divide-default">
      <li
        v-for="conversation in pastConversations"
        :key="conversation.id"
        class="flex items-center gap-2 py-2"
      >
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm text-highlighted">{{ conversation.title }}</p>
          <p class="text-xs text-muted">{{ conversation.lastMessageAt.formatted }}</p>
        </div>
        <UButton
          label="Open"
          color="neutral"
          variant="outline"
          size="sm"
          @click="openPast(conversation.id)"
        />
        <UButton
          label="Delete"
          color="error"
          variant="ghost"
          size="sm"
          @click="remove(conversation.id)"
        />
      </li>
    </ul>
  </div>
</template>

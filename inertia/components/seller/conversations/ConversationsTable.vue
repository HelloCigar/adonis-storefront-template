<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import type { TableColumn } from '@nuxt/ui'

defineProps<{ conversations: Data.Seller.ReviewConversation[] }>()

const columns: TableColumn<Data.Seller.ReviewConversation>[] = [
  { id: 'assistant', header: 'Assistant' },
  { id: 'participant', header: 'With' },
  { id: 'question', header: 'First question' },
  { id: 'activity', header: 'Last activity' },
  { id: 'flags', header: '' },
]
</script>

<template>
  <UTable
    :data="conversations"
    :columns="columns"
    :ui="{
      base: 'border-separate border-spacing-0',
      thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
      tbody: '[&>tr]:last:[&>td]:border-b-0',
      th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
      td: 'border-b border-default',
      separator: 'h-0',
    }"
  >
    <template #assistant-cell="{ row }">
      <UBadge
        :label="row.original.assistant === 'copilot' ? 'Copilot' : 'Shopping'"
        :color="row.original.assistant === 'copilot' ? 'primary' : 'neutral'"
        variant="subtle"
      />
    </template>
    <template #participant-cell="{ row }">{{ row.original.participant }}</template>
    <template #question-cell="{ row }">
      <!-- One per row: tests count and order rows by it. -->
      <span data-testid="conversation-row" class="block max-w-md whitespace-normal">
        <Link
          route="seller.conversations.show"
          :params="{ id: row.original.id }"
          class="line-clamp-2 font-medium text-highlighted hover:underline"
          >{{ row.original.firstQuestion }}</Link
        >
      </span>
    </template>
    <template #activity-cell="{ row }">
      <time :datetime="row.original.lastMessageAt.raw" class="text-muted">{{
        row.original.lastMessageAt.formatted
      }}</time>
    </template>
    <template #flags-cell="{ row }">
      <span class="flex flex-wrap gap-1">
        <UBadge
          v-if="row.original.changesApplied"
          label="Changes applied"
          color="success"
          variant="subtle"
          size="sm"
        />
        <UBadge
          v-if="row.original.unanswered"
          label="Couldn't answer"
          color="warning"
          variant="subtle"
          size="sm"
        />
      </span>
    </template>
  </UTable>
</template>

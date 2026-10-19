<script setup lang="ts">
import { computed } from 'vue'
import { Head } from '@inertiajs/vue3'
import { useRouter } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import ConversationFilters from '~/components/seller/conversations/ConversationFilters.vue'
import ConversationsTable from '~/components/seller/conversations/ConversationsTable.vue'
import ListEmpty from '~/components/seller/ListEmpty.vue'

type Filters = {
  assistant?: 'shopping' | 'copilot'
  userId?: string
  from?: string
  to?: string
  changesApplied?: boolean
  unanswered?: boolean
}

const props = defineProps<{
  conversations: {
    data: Data.Seller.ReviewConversation[]
    metadata: { total: number; perPage: number; currentPage: number }
  }
  filters: Filters
  people: { id: string; name: string }[]
}>()
const router = useRouter()

const filtered = computed(() => Object.values(props.filters).some((value) => value !== undefined))

/** Filters and paging are visits, so a filtered list can be shared or reloaded. */
const visit = (filters: Filters, page?: number) =>
  router.visit({
    route: 'seller.conversations.index',
    qs: { ...filters, ...(page && page > 1 ? { page } : {}) },
  })
</script>

<template>
  <Head title="Conversations" />
  <UDashboardPanel id="conversations">
    <template #header>
      <UDashboardNavbar title="Conversations">
        <template #leading><UDashboardSidebarCollapse /></template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <p class="text-sm text-muted">
        Everything the copilot and the shopping assistant said, newest first. Read only.
      </p>
      <ConversationFilters :filters="filters" :people="people" @change="visit" />
      <ListEmpty
        v-if="!conversations.data.length"
        :filtered="filtered"
        noun="conversations"
        icon="i-lucide-messages-square"
        title="No conversations yet"
        description="Conversations with the copilot and the shopping assistant appear here for 90 days after their last message."
        @clear="visit({})"
      />
      <ConversationsTable v-else :conversations="conversations.data" />
      <div
        v-if="conversations.metadata.total > conversations.metadata.perPage"
        class="flex flex-wrap items-center justify-between gap-3 border-t border-default pt-4 mt-auto"
      >
        <p class="text-sm text-muted">{{ conversations.metadata.total }} conversations</p>
        <UPagination
          :page="conversations.metadata.currentPage"
          :items-per-page="conversations.metadata.perPage"
          :total="conversations.metadata.total"
          @update:page="(page: number) => visit(filters, page)"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>

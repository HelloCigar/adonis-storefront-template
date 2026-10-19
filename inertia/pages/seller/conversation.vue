<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import { urlFor } from '~/client'
import BackButton from '~/components/seller/BackButton.vue'
import ConversationTranscript from '~/components/seller/conversations/ConversationTranscript.vue'

defineProps<{ conversation: Data.Seller.ReviewConversation.Variants['forTranscript'] }>()
</script>

<template>
  <Head :title="conversation.firstQuestion" />
  <UDashboardPanel id="conversation">
    <template #header>
      <UDashboardNavbar :title="conversation.firstQuestion">
        <template #leading>
          <UDashboardSidebarCollapse />
          <BackButton :to="urlFor('seller.conversations.index')" label="Conversations" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="flex flex-wrap items-center gap-2 text-sm text-muted">
        <UBadge
          :label="conversation.assistant === 'copilot' ? 'Copilot' : 'Shopping assistant'"
          :color="conversation.assistant === 'copilot' ? 'primary' : 'neutral'"
          variant="subtle"
        />
        <span>With {{ conversation.participant }}</span>
        <span>· Last activity {{ conversation.lastMessageAt.formatted }}</span>
      </div>
      <ConversationTranscript :conversation="conversation" />
    </template>
  </UDashboardPanel>
</template>

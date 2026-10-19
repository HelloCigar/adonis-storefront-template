<script setup lang="ts">
import { computed } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { urlFor } from '~/client'

/** Marks a change applied through the copilot; admins can follow it to the conversation. */
const props = defineProps<{ conversationId: string | null }>()
const page = usePage()
const href = computed(() =>
  props.conversationId && page.props.permissions.reviewConversations
    ? urlFor('seller.conversations.show', { id: props.conversationId })
    : null
)
</script>

<template>
  <ULink v-if="href" :to="href" class="text-xs font-medium text-primary hover:underline">
    via copilot
  </ULink>
  <UBadge v-else label="via copilot" color="neutral" variant="subtle" size="sm" />
</template>

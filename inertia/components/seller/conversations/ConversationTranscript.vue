<script setup lang="ts">
import { computed } from 'vue'
import type { Data } from '@generated/data'
import ReviewedProposal from '~/components/seller/conversations/ReviewedProposal.vue'
import ReviewedCartProposal from '~/components/seller/conversations/ReviewedCartProposal.vue'

const props = defineProps<{
  conversation: Data.Seller.ReviewConversation.Variants['forTranscript']
}>()

const copilotProposals = computed(
  () => new Map((props.conversation.copilotProposals ?? []).map((p) => [p.id, p]))
)
const cartProposals = computed(
  () => new Map((props.conversation.cartProposals ?? []).map((p) => [p.id, p]))
)

/** The id a tool part's output names, if it has one. */
const outputId = (part: Record<string, unknown>, key: 'proposalId' | 'id') => {
  const output = part.output
  return output && typeof output === 'object' && key in output
    ? String((output as Record<string, unknown>)[key])
    : null
}
</script>

<template>
  <ol class="flex flex-col gap-4">
    <li
      v-for="message in conversation.messages ?? []"
      :key="message.id"
      class="flex flex-col gap-2 rounded-md p-3"
      :class="message.role === 'user' ? 'bg-elevated/50 ms-12' : 'border border-default me-12'"
    >
      <p class="text-xs font-medium text-muted">
        {{ message.role === 'user' ? conversation.participant : 'Assistant' }}
      </p>
      <template v-for="(part, index) in message.parts" :key="`${message.id}-${index}`">
        <p v-if="part.type === 'text'" class="whitespace-pre-wrap text-sm">{{ part.text }}</p>
        <ReviewedProposal
          v-else-if="
            part.type === 'tool-proposeChange' &&
            copilotProposals.has(outputId(part, 'proposalId') ?? '')
          "
          :proposal="copilotProposals.get(outputId(part, 'proposalId')!)!"
          :participant="conversation.participant"
        />
        <ReviewedCartProposal
          v-else-if="
            part.type === 'tool-proposeAddToCart' && cartProposals.has(outputId(part, 'id') ?? '')
          "
          :proposal="cartProposals.get(outputId(part, 'id')!)!"
        />
      </template>
    </li>
  </ol>
</template>

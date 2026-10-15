<script setup lang="ts">
import type { Data } from '@generated/data'
import { useShoppingAssistant } from '~/composables/shoppingAssistant'

const props = defineProps<{ proposal: Data.Assistant.AssistantProposal }>()
const { decide } = useShoppingAssistant()
</script>

<template>
  <div data-testid="assistant-proposal" class="flex gap-3 rounded-md border border-default p-3">
    <img
      v-if="proposal.product.image"
      :src="proposal.product.image"
      :alt="proposal.product.title"
      class="size-16 shrink-0 rounded object-cover"
    />
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <p class="truncate text-sm font-medium text-highlighted">{{ proposal.product.title }}</p>
      <p class="text-xs text-muted">{{ proposal.variantTitle }}</p>
      <div class="flex items-center justify-between text-sm">
        <span>Qty {{ proposal.quantity }}</span>
        <span>{{ proposal.linePrice.formatted }}</span>
      </div>
      <div v-if="proposal.state === 'addable'" class="mt-1 flex gap-2">
        <UButton label="Add" size="sm" @click="decide(props.proposal.id, 'add')" />
        <UButton
          label="Not now"
          size="sm"
          color="neutral"
          variant="outline"
          @click="decide(props.proposal.id, 'dismiss')"
        />
      </div>
      <p v-else-if="proposal.state === 'added'" class="mt-1 text-sm text-success">Added to cart</p>
      <p v-else-if="proposal.state === 'dismissed'" class="mt-1 text-sm text-muted">Not added</p>
      <p v-else class="mt-1 text-sm text-muted">No longer available — ask again</p>
    </div>
  </div>
</template>

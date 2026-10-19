<script setup lang="ts">
import type { Data } from '@generated/data'

defineProps<{ proposal: Data.Assistant.AssistantProposal }>()

const states = {
  added: 'Added to cart',
  dismissed: 'Not added',
  expired: 'No longer available',
  addable: 'Not answered yet',
} as const
</script>

<template>
  <div
    data-testid="reviewed-cart-proposal"
    class="flex flex-col gap-1 rounded-md border border-default p-3 text-sm"
  >
    <p class="font-medium text-highlighted">{{ proposal.product.title }}</p>
    <p class="text-xs text-muted">{{ proposal.variantTitle }}</p>
    <div class="flex items-center justify-between">
      <span>Qty {{ proposal.quantity }}</span>
      <span>{{ proposal.linePrice.formatted }}</span>
    </div>
    <p :class="proposal.state === 'added' ? 'text-success' : 'text-muted'">
      {{ states[proposal.state] }}
    </p>
  </div>
</template>

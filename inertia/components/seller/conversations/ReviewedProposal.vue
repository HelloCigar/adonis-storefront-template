<script setup lang="ts">
import type { Data } from '@generated/data'
import CopilotChangeList from '~/components/copilot/CopilotChangeList.vue'

defineProps<{ proposal: Data.Assistant.CopilotProposal; participant: string }>()

const outcomes = {
  applied: 'Applied',
  dismissed: 'Not now',
  expired: 'Expired',
  refused: 'Refused',
  pending: 'Not answered yet',
} as const
</script>

<template>
  <div
    data-testid="reviewed-proposal"
    class="flex flex-col gap-2 rounded-md border border-default p-3"
  >
    <div class="flex flex-wrap items-center gap-2">
      <p class="text-sm font-medium text-highlighted">{{ proposal.summary }}</p>
      <UBadge
        :label="outcomes[proposal.outcome]"
        :color="proposal.outcome === 'applied' ? 'success' : 'neutral'"
        variant="subtle"
        size="sm"
      />
    </div>
    <div v-for="item in proposal.items" :key="item.id" class="flex flex-col gap-1">
      <ULink
        v-if="item.url"
        :to="item.url"
        class="text-sm font-medium text-primary hover:underline"
      >
        {{ item.recordLabel }}
      </ULink>
      <p v-else class="text-sm font-medium text-highlighted">{{ item.recordLabel }}</p>
      <CopilotChangeList :changes="item.changes" />
    </div>
    <p v-if="proposal.emailsCustomer" class="text-sm text-muted">The customer was to be emailed.</p>
    <p v-if="proposal.outcome === 'applied' && proposal.appliedAt" class="text-sm text-muted">
      Applied by {{ participant }} · {{ proposal.appliedAt.formatted }}
    </p>
    <p v-else-if="proposal.outcome === 'refused' && proposal.refusal" class="text-sm text-muted">
      {{ proposal.refusal }}
    </p>
  </div>
</template>

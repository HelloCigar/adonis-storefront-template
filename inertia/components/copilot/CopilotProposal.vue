<script setup lang="ts">
import type { Data } from '@generated/data'
import { useDashboardCopilot } from '~/composables/dashboardCopilot'
import CopilotChangeList from '~/components/copilot/CopilotChangeList.vue'

const props = defineProps<{ proposal: Data.Assistant.CopilotProposal }>()
const { decide } = useDashboardCopilot()
</script>

<template>
  <div
    data-testid="copilot-proposal"
    class="flex flex-col gap-2 rounded-md border border-default p-3"
  >
    <p class="text-sm font-medium text-highlighted">{{ proposal.summary }}</p>
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
    <p v-if="proposal.emailsCustomer" class="text-sm text-muted">The customer will be emailed.</p>
    <div v-if="proposal.outcome === 'pending'" class="mt-1 flex gap-2">
      <UButton label="Apply" size="sm" @click="decide(props.proposal.id, 'apply')" />
      <UButton
        label="Not now"
        size="sm"
        color="neutral"
        variant="outline"
        @click="decide(props.proposal.id, 'dismiss')"
      />
    </div>
    <p v-else-if="proposal.outcome === 'applied'" class="mt-1 text-sm text-success">Applied</p>
    <p v-else-if="proposal.outcome === 'dismissed'" class="mt-1 text-sm text-muted">Not applied</p>
    <p v-else class="mt-1 text-sm text-muted">
      {{ proposal.refusal ?? 'This changed since it was proposed — ask again' }}
    </p>
  </div>
</template>

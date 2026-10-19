<script setup lang="ts">
import { useDashboardCopilot } from '~/composables/dashboardCopilot'
import CopilotPanel from '~/components/copilot/CopilotPanel.vue'

const { open } = useDashboardCopilot()
</script>

<template>
  <USlideover
    v-model:open="open"
    title="Copilot"
    description="Ask about this store's orders, products, customers, content and sales."
    :modal="false"
    :overlay="false"
    :ui="{ content: 'z-[60]' }"
  >
    <!-- Hidden while open so it never covers the panel's Send button. -->
    <UButton
      v-show="!open"
      icon="i-lucide-sparkles"
      size="xl"
      class="fixed bottom-6 right-6 z-40 rounded-full shadow-lg"
      aria-label="Open copilot"
    />

    <template #content="{ close }">
      <CopilotPanel @close="close" />
    </template>
  </USlideover>
</template>

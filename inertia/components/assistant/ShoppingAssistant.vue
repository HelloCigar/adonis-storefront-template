<script setup lang="ts">
import { useShoppingAssistant } from '~/composables/shoppingAssistant'
import AssistantPanel from '~/components/assistant/AssistantPanel.vue'

const { open, hidden } = useShoppingAssistant()
</script>

<template>
  <USlideover
    v-if="!hidden"
    v-model:open="open"
    title="Shopping assistant"
    description="Ask about products, shipping, policies and your orders."
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
      aria-label="Open shopping assistant"
    />

    <template #content="{ close }">
      <AssistantPanel @close="close" />
    </template>
  </USlideover>
</template>

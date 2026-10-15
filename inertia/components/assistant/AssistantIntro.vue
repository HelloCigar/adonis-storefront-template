<script setup lang="ts">
import AssistantSuggestions from '~/components/assistant/AssistantSuggestions.vue'
</script>

<template>
  <div class="flex flex-col gap-4 py-6">
    <div class="flex flex-col gap-2 text-center">
      <UIcon name="i-lucide-sparkles" class="mx-auto size-8 text-primary" />
      <p class="font-medium text-highlighted">You're chatting with an AI assistant.</p>
      <p class="text-sm text-muted">Conversations may be reviewed by the store.</p>
    </div>
    <AssistantSuggestions />
  </div>
</template>

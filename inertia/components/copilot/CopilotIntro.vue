<script setup lang="ts">
import CopilotSuggestions from '~/components/copilot/CopilotSuggestions.vue'
</script>

<template>
  <div class="flex flex-col gap-4 py-6">
    <div class="flex flex-col gap-2 text-center">
      <UIcon name="i-lucide-sparkles" class="mx-auto size-8 text-primary" />
      <p class="font-medium text-highlighted">You're working with an AI copilot.</p>
      <p class="text-sm text-muted">Admins may review conversations.</p>
    </div>
    <CopilotSuggestions />
  </div>
</template>

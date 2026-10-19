<script setup lang="ts">
import { useDashboardCopilot } from '~/composables/dashboardCopilot'

const { suggestions, send } = useDashboardCopilot()
</script>

<template>
  <div role="group" aria-label="Suggested questions" class="flex flex-col items-start gap-2">
    <UButton
      v-for="question in suggestions"
      :key="question"
      :label="question"
      color="neutral"
      variant="outline"
      size="sm"
      @click="send(question)"
    />
  </div>
</template>

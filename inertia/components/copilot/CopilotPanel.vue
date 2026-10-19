<script setup lang="ts">
import CopilotIntro from '~/components/copilot/CopilotIntro.vue'
import CopilotThread from '~/components/copilot/CopilotThread.vue'
import CopilotHistory from '~/components/copilot/CopilotHistory.vue'
import { useDashboardCopilot } from '~/composables/dashboardCopilot'

defineEmits<{ close: [] }>()

const { busy, startNew, history, showingHistory } = useDashboardCopilot()
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="flex items-center gap-2 border-b border-default px-4 py-3">
      <p class="font-semibold text-highlighted">Copilot</p>
      <UBadge label="AI" variant="subtle" size="sm" />
      <div class="ms-auto flex items-center gap-1">
        <UButton
          icon="i-lucide-history"
          color="neutral"
          variant="ghost"
          aria-label="Past conversations"
          @click="history"
        />
        <UButton
          icon="i-lucide-square-pen"
          color="neutral"
          variant="ghost"
          aria-label="New conversation"
          :disabled="busy"
          @click="startNew"
        />
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          aria-label="Close"
          @click="$emit('close')"
        />
      </div>
    </header>

    <div class="min-h-0 flex-1 p-4">
      <CopilotHistory v-if="showingHistory" />
      <CopilotThread v-else>
        <template #empty>
          <CopilotIntro />
        </template>
      </CopilotThread>
    </div>
  </div>
</template>

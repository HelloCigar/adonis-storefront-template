<script setup lang="ts">
import { useOrderInteraction } from './interaction'

defineProps<{ refreshing: boolean }>()
const emit = defineEmits<{ refresh: [] }>()
const { busy, error, uncertain } = useOrderInteraction()
</script>

<template>
  <div
    v-if="error"
    role="alert"
    class="rounded-lg bg-elevated/50 p-4 sm:p-5 border border-error/40"
  >
    <p class="font-semibold text-highlighted">
      {{ uncertain ? 'Check status before continuing' : 'Action needs attention' }}
    </p>
    <p class="text-sm text-default mt-2 [overflow-wrap:anywhere]">{{ error }}</p>
    <UButton
      label="Refresh status"
      icon="i-lucide-refresh-cw"
      color="neutral"
      variant="outline"
      class="mt-3"
      :loading="refreshing"
      :disabled="busy"
      @click="emit('refresh')"
    />
  </div>
</template>

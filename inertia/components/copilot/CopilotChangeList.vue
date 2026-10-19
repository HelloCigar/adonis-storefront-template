<script setup lang="ts">
import type { Data } from '@generated/data'

defineProps<{ changes: Data.Assistant.CopilotProposalItem['changes'] }>()
</script>

<template>
  <ul class="flex flex-col gap-0.5 text-sm">
    <li v-for="change in changes" :key="change.field">
      {{
        change.before
          ? `${change.label}: ${change.before.formatted} → ${change.after.formatted}`
          : `${change.label}: ${change.after.formatted}`
      }}
    </li>
  </ul>
</template>

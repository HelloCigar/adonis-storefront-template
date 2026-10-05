<script setup lang="ts">
import { useDashboard } from '../composables/useDashboard'

const { isNotificationsSlideoverOpen } = useDashboard()
</script>

<template>
  <USlideover v-model:open="isNotificationsSlideoverOpen" title="Notifications">
    <template #body>
      <UEmpty icon="i-lucide-bell" title="No notifications" description="You're all caught up." />
    </template>
  </USlideover>
</template>

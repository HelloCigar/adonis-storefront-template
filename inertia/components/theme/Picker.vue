<script setup lang="ts">
import ThemeColors from '~/components/theme/Colors.vue'
</script>

<template>
  <UPopover :content="{ align: 'end', collisionPadding: 12 }">
    <UButton icon="i-lucide-palette" variant="ghost" color="neutral" aria-label="Theme" />

    <template #content>
      <div class="w-80 p-4">
        <p class="text-sm font-semibold text-highlighted mb-4">Theme</p>
        <ThemeColors />
      </div>
    </template>
  </UPopover>
</template>

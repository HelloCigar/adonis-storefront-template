<script setup lang="ts">
import ThemeColors from '~/components/theme/Colors.vue'
</script>

<template>
  <section class="mt-8">
    <UPageCard
      title="Appearance"
      description="Choose how the store looks in this browser."
      variant="naked"
      class="mb-4"
    />
    <UPageCard variant="subtle">
      <ThemeColors />
    </UPageCard>
  </section>
</template>

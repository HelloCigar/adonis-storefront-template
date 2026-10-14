<script setup lang="ts">
import FlashToasts from '~/components/flash_toasts.vue'
</script>

<template>
  <slot />
  <FlashToasts />
</template>

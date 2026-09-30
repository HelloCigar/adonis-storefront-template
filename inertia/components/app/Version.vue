<script setup lang="ts">
import { t } from '~/utils/store'
const version = '4.9'
</script>
<template>
  <p class="pb-2 pe-3 md:pb-4">
    <span class="text-sm text-muted">
      {{ t('footer.builtWith') }}
    </span>

    <br />

    <span class="font-medium"> Nuxt UI v{{ version }} </span>
  </p>
</template>

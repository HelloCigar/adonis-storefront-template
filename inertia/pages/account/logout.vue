<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { urlFor } from '~/client'
import { onMounted } from 'vue'
onMounted(() => router.post(urlFor('session.destroy')))
</script>
<template>
  <div class="flex justify-center py-16">
    <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-muted" />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from '@adonisjs/inertia/vue'
import { onMounted } from 'vue'
const router = useRouter()
onMounted(() => router.post({ route: 'session.destroy' }))
</script>
<template>
  <div class="flex justify-center py-16">
    <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-muted" />
  </div>
</template>

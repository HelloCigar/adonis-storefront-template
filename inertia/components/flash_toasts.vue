<script setup lang="ts">
import { watch } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { useToast } from '@nuxt/ui/composables'

const page = usePage()
const toast = useToast()

watch(
  () => page.url,
  () => toast.clear()
)

watch(
  () => page.flash,
  (flash) => {
    if (flash?.error) {
      toast.add({ id: 'flash', title: flash.error, color: 'error', icon: 'i-lucide-circle-alert' })
    }
    if (flash?.success) {
      toast.add({
        id: 'flash',
        title: flash.success,
        color: 'primary',
        icon: 'i-lucide-circle-check',
      })
    }
  },
  { immediate: true }
)
</script>

<template>
  <span class="hidden" />
</template>

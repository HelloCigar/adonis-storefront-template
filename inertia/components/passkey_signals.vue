<script setup lang="ts">
import { watch } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { sendSignal } from '@simplewebauthn/browser'

const page = usePage()

watch(
  () => page.flash,
  (flash) => {
    for (const signal of flash.passkeySignals ?? []) {
      sendSignal(signal).catch(() => {})
    }
  },
  { immediate: true }
)
</script>

<template>
  <span class="hidden" />
</template>

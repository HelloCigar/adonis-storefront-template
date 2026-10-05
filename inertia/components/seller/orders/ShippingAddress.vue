<script setup lang="ts">
import { computed } from 'vue'
import type { Data } from '@generated/data'
import { useToast } from '@nuxt/ui/composables'

const props = defineProps<{ address: Data.Checkout.OrderAddress | null; headingId: string }>()
const toast = useToast()
const lines = computed(() => props.address?.formatted?.filter(Boolean) ?? [])

async function copy() {
  try {
    await navigator.clipboard.writeText(lines.value.join('\n'))
    toast.add({ id: 'address-copied', title: 'Shipping address copied', color: 'success' })
  } catch {
    toast.add({
      id: 'address-copied',
      title: 'Copy was blocked by the browser. Select the address to copy it.',
      color: 'warning',
    })
  }
}
</script>

<template>
  <section :aria-labelledby="headingId">
    <div class="flex items-center justify-between gap-3">
      <h3 :id="headingId" class="text-sm font-semibold text-highlighted">Ship to</h3>
      <UButton
        v-if="lines.length"
        icon="i-lucide-copy"
        label="Copy"
        size="xs"
        color="neutral"
        variant="ghost"
        aria-label="Copy shipping address"
        @click="copy"
      />
    </div>
    <address
      v-if="lines.length"
      class="mt-2 not-italic text-sm text-default [overflow-wrap:anywhere]"
    >
      <span v-for="(line, index) in lines" :key="index" class="block">{{ line }}</span>
      <span v-if="address?.phoneNumber" class="block mt-1"
        ><bdi>{{ address.phoneNumber }}</bdi></span
      >
    </address>
    <p v-else class="mt-2 text-sm text-default">
      No shipping address is recorded. Contact the customer before dispatch.
    </p>
  </section>
</template>

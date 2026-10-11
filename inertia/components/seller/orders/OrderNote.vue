<script setup lang="ts">
import { ref } from 'vue'
import type { Data } from '@generated/data'
import StatusForm from './StatusForm.vue'

defineProps<{ order: Data.Seller.Order; editable?: boolean }>()
const editing = ref(false)
</script>

<template>
  <section aria-labelledby="order-note-title">
    <div class="flex items-center justify-between gap-3">
      <h2 id="order-note-title" class="text-lg font-semibold text-highlighted">Order note</h2>
      <UButton
        v-if="editable && !editing"
        :label="order.note ? 'Edit' : 'Add note'"
        icon="i-lucide-pencil"
        size="xs"
        color="neutral"
        variant="ghost"
        @click="editing = true"
      />
    </div>
    <p
      v-if="!editing && order.note"
      class="mt-3 text-sm text-default whitespace-pre-line [overflow-wrap:anywhere]"
    >
      {{ order.note }}
    </p>
    <p v-else-if="!editing" class="mt-3 text-sm text-muted">
      No note. Notes customers leave at checkout appear here.
    </p>
    <div v-if="editing" class="mt-3"><StatusForm :order="order" @saved="editing = false" /></div>
  </section>
</template>

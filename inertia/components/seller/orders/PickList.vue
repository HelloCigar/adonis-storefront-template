<script setup lang="ts">
import { computed } from 'vue'
import type { Data } from '@generated/data'

const props = withDefaults(
  defineProps<{
    items: Data.Checkout.OrderLineItem[]
    headingId?: string
    title?: string | null
  }>(),
  { headingId: undefined, title: 'Pick list' }
)
const units = computed(() => props.items.reduce((total, item) => total + item.quantity, 0))
</script>

<template>
  <section :aria-labelledby="title ? headingId : undefined">
    <div class="flex items-baseline gap-3" :class="title ? 'justify-between' : 'justify-end'">
      <h3 v-if="title" :id="headingId" class="text-sm font-semibold text-highlighted">
        {{ title }}
      </h3>
      <span class="text-sm text-muted tabular-nums"
        >{{ units }} {{ units === 1 ? 'unit' : 'units' }}</span
      >
    </div>
    <ul v-if="items.length" class="mt-2 divide-y divide-default">
      <li v-for="item in items" :key="item.id" class="flex gap-4 py-3">
        <span
          class="w-10 shrink-0 text-lg font-semibold leading-6 text-highlighted tabular-nums"
          aria-hidden="true"
          >{{ item.quantity }}×</span
        >
        <span class="sr-only">Quantity {{ item.quantity }}:</span>
        <div class="min-w-0 [overflow-wrap:anywhere]">
          <p class="font-medium text-highlighted">{{ item.title }}</p>
          <p v-if="item.variantTitle || item.sku" class="mt-0.5 text-sm text-muted">
            <span v-if="item.variantTitle">{{ item.variantTitle }}</span
            ><span v-if="item.variantTitle && item.sku"> · </span
            ><span v-if="item.sku"
              >SKU <bdi class="tabular-nums">{{ item.sku }}</bdi></span
            >
          </p>
        </div>
      </li>
    </ul>
    <p v-else class="mt-2 text-sm text-default">
      No items are recorded. Check the order before packing.
    </p>
  </section>
</template>

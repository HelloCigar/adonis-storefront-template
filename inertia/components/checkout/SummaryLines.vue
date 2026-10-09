<script setup lang="ts">
defineProps<{
  lines: {
    key: string | number
    title: string
    detail?: string | null
    quantity: number
    amount: string
  }[]
}>()
</script>
<template>
  <ul class="divide-y divide-default">
    <li
      v-for="line in lines"
      :key="line.key"
      class="flex items-start gap-3 py-3 text-sm first:pt-0 last:pb-0"
    >
      <span
        class="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-elevated px-1.5 text-xs font-medium tabular-nums text-highlighted ring ring-inset ring-default"
        ><span class="sr-only">Quantity</span>{{ line.quantity }}</span
      >
      <div class="min-w-0 grow">
        <p class="font-medium text-highlighted">{{ line.title }}</p>
        <p v-if="line.detail" class="text-muted">{{ line.detail }}</p>
      </div>
      <span class="shrink-0 tabular-nums">{{ line.amount }}</span>
    </li>
  </ul>
</template>

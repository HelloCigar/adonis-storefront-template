<script setup lang="ts">
import type { Data } from '@generated/data'

type Step = 'identity' | 'shipping' | 'policies'

defineProps<{
  step: Step
  progress: Data.Settings.StoreSetting.Variants['forSetup']['progress']
}>()

const steps: { key: Step; label: string }[] = [
  { key: 'identity', label: 'Store details' },
  { key: 'shipping', label: 'Shipping' },
  { key: 'policies', label: 'Policies' },
]
</script>

<template>
  <ol class="flex flex-wrap gap-2 sm:gap-4">
    <li
      v-for="(item, index) in steps"
      :key="item.key"
      :aria-current="item.key === step ? 'step' : undefined"
      class="flex items-center gap-2 text-sm"
      :class="item.key === step ? 'text-highlighted font-medium' : 'text-muted'"
    >
      <span
        class="inline-flex size-6 items-center justify-center rounded-full border text-xs"
        :class="
          progress[item.key]
            ? 'border-primary bg-primary text-inverted'
            : item.key === step
              ? 'border-primary text-primary'
              : 'border-default'
        "
      >
        <UIcon v-if="progress[item.key]" name="i-lucide-check" class="size-3.5" />
        <template v-else>{{ index + 1 }}</template>
      </span>
      {{ item.label }}
    </li>
  </ol>
</template>

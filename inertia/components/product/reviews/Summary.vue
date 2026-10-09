<script setup lang="ts">
import { computed } from 'vue'
import ReviewStars from './Stars.vue'
import type { ReviewSummary } from './types'
const props = defineProps<{ summary: ReviewSummary }>()
const bars = computed(() =>
  ([5, 4, 3, 2, 1] as const).map((rating) => ({
    rating,
    count: props.summary.distribution[rating],
    percent: props.summary.count
      ? (props.summary.distribution[rating] / props.summary.count) * 100
      : 0,
  }))
)
</script>
<template>
  <div v-if="summary.count && summary.average !== null" class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <ReviewStars :rating="summary.average" size="size-5" />
      <p class="font-medium text-highlighted">
        {{ summary.average.toFixed(1) }} · {{ summary.count }}
        {{ summary.count === 1 ? 'review' : 'reviews' }}
      </p>
    </div>

    <ul class="space-y-1.5" aria-label="Rating breakdown">
      <li v-for="bar in bars" :key="bar.rating" class="flex items-center gap-3 text-sm">
        <span class="w-14 shrink-0 text-muted">
          {{ bar.rating }} {{ bar.rating === 1 ? 'star' : 'stars' }}
        </span>
        <span class="h-2 flex-1 overflow-hidden rounded-full bg-elevated" aria-hidden="true">
          <span
            class="block h-full rounded-full bg-primary"
            :style="{ width: `${bar.percent}%` }"
          />
        </span>
        <span class="w-6 shrink-0 text-right tabular-nums text-muted">{{ bar.count }}</span>
      </li>
    </ul>
  </div>
  <p v-else class="text-muted">No reviews yet.</p>
</template>

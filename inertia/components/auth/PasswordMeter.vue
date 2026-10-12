<script setup lang="ts">
import { computed } from 'vue'
import type { PasswordScore } from '@adonisplus/persona/password_policy/types'

const LABELS = ['Very weak', 'Weak', 'Medium', 'Strong', 'Very strong'] as const
const TONES = {
  error: { bar: 'bg-error', text: 'text-error' },
  warning: { bar: 'bg-warning', text: 'text-warning' },
  info: { bar: 'bg-info', text: 'text-info' },
  success: { bar: 'bg-success', text: 'text-success' },
} as const

const props = defineProps<{ score: PasswordScore; valid: boolean }>()
const label = computed(() => LABELS[props.score])
const tone = computed(() => {
  if (props.valid) return TONES.success
  if (props.score <= 1) return TONES.error
  return props.score === 2 ? TONES.warning : TONES.info
})
</script>

<template>
  <div :data-acceptable="valid" :data-score="score" class="mt-2 flex items-center gap-3">
    <div
      role="meter"
      aria-label="Password strength"
      aria-valuemin="0"
      aria-valuemax="4"
      :aria-valuenow="score"
      :aria-valuetext="label"
      class="grid flex-1 grid-cols-4 gap-1"
    >
      <span
        v-for="step in 4"
        :key="step"
        :data-filled="score >= step"
        class="h-1.5 rounded-full transition-colors duration-150"
        :class="score >= step ? tone.bar : 'bg-accented'"
      />
    </div>
    <p aria-live="polite" class="w-24 text-end text-xs font-medium" :class="tone.text">
      {{ label }}
    </p>
  </div>
</template>

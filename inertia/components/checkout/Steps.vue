<script setup lang="ts">
const props = defineProps<{ current: number }>()
const steps = ['Details', 'Payment', 'Confirmation']
const state = (index: number) =>
  index < props.current ? 'done' : index === props.current ? 'current' : 'next'
</script>
<template>
  <nav aria-label="Checkout progress">
    <ol class="flex items-center gap-2 text-sm">
      <li v-for="(step, index) in steps" :key="step" class="flex items-center gap-2">
        <UIcon
          v-if="index > 0"
          name="i-lucide-chevron-right"
          class="size-4 text-dimmed"
          aria-hidden="true"
        />
        <span
          :aria-current="state(index) === 'current' ? 'step' : undefined"
          class="inline-flex items-center gap-1.5"
          :class="{
            'font-medium text-primary': state(index) === 'current',
            'text-default': state(index) === 'done',
            'text-muted': state(index) === 'next',
          }"
        >
          <UIcon
            v-if="state(index) === 'done'"
            name="i-lucide-circle-check"
            class="size-4 text-primary"
          />
          <span
            v-else
            class="inline-flex size-5 items-center justify-center rounded-full text-xs"
            :class="
              state(index) === 'current'
                ? 'bg-primary text-inverted'
                : 'ring ring-inset ring-accented'
            "
            aria-hidden="true"
            >{{ index + 1 }}</span
          >
          {{ step }}
        </span>
      </li>
    </ol>
  </nav>
</template>

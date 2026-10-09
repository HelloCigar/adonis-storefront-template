<script setup lang="ts">
import { computed } from 'vue'
const props = withDefaults(defineProps<{ rating: number; size?: string }>(), {
  size: 'size-4',
})
const filled = computed(() => Math.round(props.rating))
</script>
<template>
  <span
    role="img"
    :aria-label="`${rating} out of 5 stars`"
    class="inline-flex items-center gap-0.5"
  >
    <UIcon
      v-for="star in 5"
      :key="star"
      name="i-lucide-star"
      aria-hidden="true"
      :class="[size, star <= filled ? 'fill-current text-primary' : 'text-accented']"
    />
  </span>
</template>

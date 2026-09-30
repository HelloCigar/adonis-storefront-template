<script setup lang="ts">
import type { Data } from '@generated/data'
import { computed, ref } from 'vue'
const props = defineProps<{
  image?: Partial<Pick<Data.Media, 'url' | 'altText' | 'width' | 'height'>>
  title?: string
  loading?: 'eager' | 'lazy'
}>()

const emits = defineEmits<{
  (e: 'load'): void
}>()

const imgLoading = ref(props.loading === 'eager' ? false : true)

const url = computed(() => props.image?.url)

const handleImageLoad = () =>
  requestAnimationFrame(() => {
    imgLoading.value = false

    emits('load')
  })
</script>
<template>
  <div
    :class="{
      'animate-pulse': imgLoading,
    }"
    class="max-w-full rounded-md overflow-hidden"
  >
    <img
      :src="url"
      :alt="props.image?.altText ?? props.title ?? undefined"
      :width="props.image?.width ?? undefined"
      :height="props.image?.height ?? undefined"
      class="aspect-square max-w-full max-h-full animate-pop-up select-none object-contain"
      :loading="props.loading ?? 'lazy'"
      :fetchpriority="props.loading === 'eager' ? 'high' : undefined"
      @load="handleImageLoad"
    />
  </div>
</template>

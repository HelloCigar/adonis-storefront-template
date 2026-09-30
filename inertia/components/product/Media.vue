<script setup lang="ts">
import type { Data } from '@generated/data'
import ProductImage from '~/components/product/Image.vue'
defineProps<{ media: Data.Media; title?: string; loading?: 'eager' | 'lazy' }>()
</script>
<template>
  <video
    v-if="media.__typename === 'Video' && media.sources.length"
    :poster="media.previewImage?.url ?? undefined"
    class="aspect-square w-full rounded-md bg-elevated object-cover"
    controls
    playsinline
  >
    <source
      v-for="source in media.sources"
      :key="source.url"
      :src="source.url"
      :type="source.mimeType"
    />
  </video>

  <ProductImage
    v-else
    :image="
      media.__typename === 'MediaImage'
        ? (media.image ?? undefined)
        : (media.previewImage ?? undefined)
    "
    :title="media.alt ?? title"
    :loading="loading"
  />
</template>

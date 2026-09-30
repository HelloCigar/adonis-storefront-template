<script setup lang="ts">
import type { Data } from '@generated/data'
import { computed } from 'vue'
import { storePath as localePath } from '~/utils/store'
const props = defineProps<{ collections: Data.Collection[]; first?: number }>()
const collections = computed(() => props.collections.slice(0, props.first ?? 50))
</script>
<template>
  <div class="sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-2 lg:grid-cols-3">
    <UPageCard
      v-for="(collection, index) in collections"
      :key="`collection-${index}`"
      class="mb-4"
      :title="collection.title"
      :description="collection.description ?? undefined"
      :to="localePath(`/collection/${collection.handle}`)"
      reverse
    >
      <img
        v-if="collection.image"
        :src="collection.image.url"
        :alt="collection.image.altText || collection.title"
        class="rounded-md object-cover aspect-square"
        :width="600"
        :height="600"
      />
    </UPageCard>
  </div>
</template>

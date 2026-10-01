<script setup lang="ts">
import { urlFor } from '~/client'
import type { Data } from '@generated/data'
import type { CollectionCatalogue } from '~/types/collection'
import { computed } from 'vue'
import { t } from '~/utils/store'
import CollectionProducts from '~/components/collection/Products.vue'
import { Head } from '@inertiajs/vue3'
const props = defineProps<{ collection: Data.Collection; catalogue: CollectionCatalogue }>()
const handle = computed(() => props.collection.handle)
</script>
<template>
  <Head :title="collection.title" />
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb
      :items="[
        { label: t('breadcrumb.collections') },
        { label: collection?.title, to: urlFor('collections.show', { handle }) },
      ]"
      class="mb-6 lg:mb-8"
    />

    <h1 class="text-4xl lg:text-5xl text-highlighted font-extrabold mb-6 lg:mb-8">
      {{ collection?.title }}
    </h1>

    <p class="lg:text-lg max-w-md mb-8 lg:mb-10">
      {{ collection?.description }}
    </p>

    <CollectionProducts :handle="handle" :catalogue="catalogue" />
  </UContainer>
</template>

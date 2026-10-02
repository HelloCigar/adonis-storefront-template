<script setup lang="ts">
import type { Data } from '@generated/data'
import { t } from '~/utils/store'
import CollectionGrid from '~/components/collection/Grid.vue'
import { Head } from '@inertiajs/vue3'
defineProps<{ collections: Data.Catalog.Collection[] }>()
</script>
<template>
  <Head :title="t('collection.all')" />
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb :items="[{ label: t('collection.all') }]" class="mb-6 lg:mb-8" />

    <h1 class="text-4xl lg:text-5xl text-highlighted font-extrabold mb-6 lg:mb-8">
      {{ t('collection.all') }}
    </h1>

    <p class="lg:text-lg max-w-md mb-8 lg:mb-10">
      {{ t('collection.description') }}
    </p>

    <CollectionGrid :first="50" :collections="collections" />
  </UContainer>
</template>

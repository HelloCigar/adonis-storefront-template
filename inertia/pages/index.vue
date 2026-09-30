<script setup lang="ts">
import type { Data } from '@generated/data'
import { t } from '~/utils/store'
import CollectionGrid from '~/components/collection/Grid.vue'
import ProductSlider from '~/components/product/Slider.vue'
import { Head } from '@inertiajs/vue3'
const props = defineProps<{
  bestsellingProducts: Data.Product[]
  newestProducts: Data.Product[]
  collections: Data.Collection[]
}>()
</script>
<template>
  <Head :title="'Home'" />
  <UContainer class="py-12 lg:py-16">
    <h1 class="text-4xl lg:text-5xl text-gray-900 font-extrabold mb-6 lg:mb-8">
      {{ t('home.title') }}
    </h1>

    <p class="lg:text-lg mb-12 lg:mb-16">
      {{ t('home.description') }}
    </p>

    <h2 class="text-3xl lg:text-4xl text-gray-900 font-bold mb-6 lg:mb-8">
      {{ t('home.products.bestsellers') }}
    </h2>

    <div class="mb-12 sm:px-12 lg:mb-16 2xl:px-0">
      <ProductSlider :first="12" :products="props.bestsellingProducts" loading="eager" />
    </div>

    <h2 class="text-3xl lg:text-4xl text-gray-900 font-bold mb-6 lg:mb-8">
      {{ t('home.products.newest') }}
    </h2>

    <div class="mb-12 sm:px-12 lg:mb-16 2xl:px-0">
      <ProductSlider :first="12" :products="props.newestProducts" loading="eager" />
    </div>

    <h2 class="text-3xl lg:text-4xl text-gray-900 font-bold mb-6 lg:mb-8">
      {{ t('collection.all') }}
    </h2>

    <CollectionGrid :collections="props.collections" />
  </UContainer>
</template>

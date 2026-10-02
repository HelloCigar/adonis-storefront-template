<script setup lang="ts">
import type { Data } from '@generated/data'
import { computed } from 'vue'
import ProductCard from '~/components/product/Card.vue'
const props = defineProps<{
  products: Data.Catalog.Product[]
  first?: number
  loading?: 'eager' | 'lazy'
}>()
const products = computed(() => props.products.slice(0, props.first ?? 12))
</script>
<template>
  <UCarousel
    v-slot="{ item: product, index }"
    :items="products ?? []"
    class="w-full mb-6"
    :ui="{ item: 'md:basis-1/2 lg:basis-1/3' }"
    arrows
  >
    <ProductCard
      :product="product"
      :recommendations="props.products"
      :loading="index < 3 ? props.loading : 'lazy'"
    />
  </UCarousel>
</template>

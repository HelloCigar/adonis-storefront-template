<script setup lang="ts">
import { computed } from 'vue'
import type { CollectionCatalogue } from '~/types/collection'
import { t } from '~/utils/store'
import { provideCollection } from '~/composables/collection'
import FilterGroup from '~/components/filter/Group.vue'
import ProductCard from '~/components/product/Card.vue'

const props = defineProps<{ handle: string; catalogue: CollectionCatalogue }>()
const { loading, goToPage, clearFilters } = provideCollection(
  () => props.handle,
  () => props.catalogue
)
const products = computed(() => props.catalogue.products)
const pageInfo = computed(() => props.catalogue.pageInfo)
const loadPrevious = () => goToPage(pageInfo.value.currentPage - 1)
const loadNext = () => goToPage(pageInfo.value.currentPage + 1)
</script>
<template>
  <div class="w-full lg:grid lg:grid-cols-12">
    <FilterGroup :vendors="catalogue.vendors" class="lg:col-span-4 xl:col-span-3" />

    <div class="my-12 lg:my-14 lg:col-span-8 xl:col-span-9">
      <div v-if="pageInfo?.hasPreviousPage" class="flex w-full justify-center pb-8 md:mb-8">
        <UButton
          variant="soft"
          color="primary"
          class="cursor-pointer"
          icon="i-lucide-arrow-up"
          @click="loadPrevious"
        >
          {{ t('pagination.previous') }}
        </UButton>
      </div>

      <div class="grid w-full grid-cols-1 gap-16 md:grid-cols-2 xl:grid-cols-3">
        <ProductCard
          v-for="(product, index) in products"
          :key="product.id"
          :product="product"
          :recommendations="products"
          class="pb-14 border-b border-b-default"
          :loading="index < 3 ? 'eager' : 'lazy'"
          carousel
        />
      </div>

      <div v-if="pageInfo?.hasNextPage" class="flex w-full justify-center mt-14">
        <UButton
          variant="soft"
          color="primary"
          class="cursor-pointer"
          icon="i-lucide-arrow-down"
          @click="loadNext"
        >
          {{ t('pagination.next') }}
        </UButton>
      </div>

      <div v-if="loading" class="flex justify-center pt-8">
        {{ t('collection.products.loading') }}
      </div>

      <div
        v-else-if="products.length === 0"
        class="flex flex-col justify-center items-center col-span-full text-center"
      >
        <div class="flex items-center pb-2 gap-2">
          <UIcon name="i-lucide-triangle-alert" class="text-dimmed size-6" />

          <p class="text-xl text-dimmed">
            {{ t('collection.products.notFound') }}
          </p>
        </div>

        <UButton
          variant="subtle"
          color="primary"
          class="mt-4"
          :label="t('filters.clear')"
          @click="clearFilters"
        />
      </div>
    </div>
  </div>
</template>

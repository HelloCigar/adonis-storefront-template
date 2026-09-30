<script setup lang="ts">
import type { Data } from '@generated/data'
import { computed, ref } from 'vue'
import { usePage, router } from '@inertiajs/vue3'
import { t, storePath as localePath } from '~/utils/store'
import type { Filter } from '~/types/store'
import { useFilters } from '~/composables/filters'
import { useCollection } from '~/composables/collection'
import FilterGroup from '~/components/filter/Group.vue'
import ProductCard from '~/components/product/Card.vue'
const props = defineProps<{ handle: string; products: Data.Product[] }>()
const page = usePage()
const { params } = useCollection()
const { filters: applied, set } = useFilters()
const filters = computed<Filter[]>(() => {
  const vendor = [
    ...new Set(
      props.products.map((product) => product.vendor).filter((value): value is string => !!value)
    ),
  ]
  return [
    {
      id: 'available',
      label: 'Availability',
      type: 'BOOLEAN',
      values: [{ id: 'available', label: 'In stock', input: JSON.stringify({ available: true }) }],
    },
    {
      id: 'price',
      label: 'Price',
      type: 'PRICE_RANGE',
      values: [{ id: 'price', label: 'Price', input: JSON.stringify({ price: {} }) }],
    },
    ...(vendor.length
      ? [
          {
            id: 'vendor',
            label: 'Vendor',
            type: 'LIST' as const,
            values: vendor.map((value) => ({
              id: value,
              label: value,
              input: JSON.stringify({ vendor: value }),
            })),
          },
        ]
      : []),
  ]
})
const filtered = computed(() =>
  props.products.filter((product) =>
    applied.value.every((filter) => {
      if (filter.available !== undefined && !!product.availableForSale !== filter.available)
        return false
      if (filter.vendor && product.vendor !== filter.vendor) return false
      const price = product.priceRange?.minVariantPrice.amount ?? 0
      if (filter.price?.min !== undefined && price < filter.price.min) return false
      if (filter.price?.max !== undefined && price > filter.price.max) return false
      return true
    })
  )
)
const currentPage = computed(() =>
  Math.max(1, Math.min(params.value.page, Math.ceil(filtered.value.length / 12) || 1))
)
const displayedProducts = computed(() =>
  filtered.value.slice((currentPage.value - 1) * 12, currentPage.value * 12)
)
const pageInfo = computed(() => ({
  hasPreviousPage: currentPage.value > 1,
  hasNextPage: currentPage.value * 12 < filtered.value.length,
}))
const status = ref<string>('success')
const visit = (value: number) => {
  const query = new URLSearchParams(page.url.split('?')[1])
  query.set('page', String(value))
  router.get(localePath('/collection/' + props.handle) + '?' + query, {}, { preserveState: true })
}
const loadPrevious = () => visit(currentPage.value - 1)
const loadNext = () => visit(currentPage.value + 1)
const clear = () => set([])
</script>
<template>
  <div class="w-full lg:grid lg:grid-cols-12">
    <FilterGroup v-if="filters?.length" :filters="filters" class="lg:col-span-4 xl:col-span-3" />

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
          v-for="(product, index) in displayedProducts"
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

      <div v-if="status === 'pending'" class="flex justify-center pt-8">
        {{ t('collection.products.loading') }}
      </div>

      <div
        v-else-if="displayedProducts.length === 0"
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
          @click="clear"
        />
      </div>
    </div>
  </div>
</template>

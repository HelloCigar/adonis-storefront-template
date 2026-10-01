<script setup lang="ts">
import { computed } from 'vue'
import { t } from '~/utils/store'
import { useCollection } from '~/composables/collection'
import FilterTypeBoolean from '~/components/filter/type/Boolean.vue'
import FilterTypeList from '~/components/filter/type/List.vue'
import FilterTypePriceRange from '~/components/filter/type/PriceRange.vue'

const props = defineProps<{ vendors: string[] }>()
const { query, clearFilters } = useCollection()
const filters = computed(() => [
  { label: 'Availability', slot: 'availability' as const },
  { label: 'Price', slot: 'price' as const },
  ...(props.vendors.length ? [{ label: 'Vendor', slot: 'vendor' as const }] : []),
])
const quantity = computed(
  () =>
    Number(query.value.available !== undefined) +
    query.value.vendor.length +
    Number(query.value.minPrice !== undefined || query.value.maxPrice !== undefined)
)
defineExpose({ reset: clearFilters })
</script>
<template>
  <div class="lg:mt-14 lg:me-16">
    <div class="lg:sticky lg:top-24">
      <div class="flex justify-between items-center mb-4">
        <p class="leading-8 text-xl font-bold">
          {{ t('filters.title') }}
        </p>

        <div v-if="quantity" class="relative">
          <UButton
            variant="ghost"
            color="primary"
            class="ms-4"
            :label="t('filters.clear')"
            @click="clearFilters"
          />

          <UBadge
            class="absolute font-bold rounded-full -top-1.5 -right-2 px-1.5 font-mono lg:text-xs lg:-right-3 lg:-top-2"
            size="xs"
          >
            {{ quantity }}
          </UBadge>
        </div>
      </div>

      <UAccordion :items="filters" type="multiple">
        <template #availability-body>
          <FilterTypeBoolean />
        </template>
        <template #price-body>
          <FilterTypePriceRange />
        </template>
        <template #vendor-body>
          <FilterTypeList :vendors="vendors" />
        </template>
      </UAccordion>
    </div>
  </div>
</template>

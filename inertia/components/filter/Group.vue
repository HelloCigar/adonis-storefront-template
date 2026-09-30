<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { t } from '~/utils/store'
import type { Filter } from '~/types/store'
import { useFilters } from '~/composables/filters'
import FilterTypeBoolean from '~/components/filter/type/Boolean.vue'
import FilterTypeList from '~/components/filter/type/List.vue'
import FilterTypePriceRange from '~/components/filter/type/PriceRange.vue'
const props = defineProps<{ filters?: Filter[] }>()
const { filters: applied, set } = useFilters()
const filters = computed(() =>
  props.filters?.map((filter) => ({
    label: filter.label,
    component:
      filter.type === 'PRICE_RANGE'
        ? FilterTypePriceRange
        : filter.type === 'BOOLEAN'
          ? FilterTypeBoolean
          : FilterTypeList,
    props: { filter },
  }))
)
const quantity = computed(() => applied.value.length)
const filtersKey = ref(0)
const resetFilters = () => {
  filtersKey.value += 1
  set([])
}
watch(applied, (value) => {
  if (!value.length) filtersKey.value += 1
})
defineExpose({ reset: resetFilters })
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
            @click="resetFilters"
          />

          <UBadge
            class="absolute font-bold rounded-full -top-1.5 -right-2 px-1.5 font-mono lg:text-xs lg:-right-3 lg:-top-2"
            size="xs"
          >
            {{ quantity }}
          </UBadge>
        </div>
      </div>

      <UAccordion :key="filtersKey" :items="filters" type="multiple">
        <template #body="{ item }">
          <component :is="item.component" v-bind="item.props" />
        </template>
      </UAccordion>
    </div>
  </div>
</template>

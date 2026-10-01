<script setup lang="ts">
import { reactive, watch } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { t } from '~/utils/store'
import { useCollection } from '~/composables/collection'

const page = usePage()
const { query, setFilters } = useCollection()
const state = reactive({ minPrice: query.value.minPrice, maxPrice: query.value.maxPrice })
watch(query, (params) => {
  state.minPrice = params.minPrice
  state.maxPrice = params.maxPrice
})
const submit = () => setFilters({ ...state })
</script>
<template>
  <div class="flex flex-row gap-4">
    <UFormField name="minPrice" :label="t('price.from')" :error="page.props.errors.minPrice">
      <UInputNumber
        v-model="state.minPrice"
        class="w-24"
        :min="0"
        :max="state.maxPrice"
        @change="submit"
      />
    </UFormField>
    <UFormField name="maxPrice" :label="t('price.to')" :error="page.props.errors.maxPrice">
      <UInputNumber
        v-model="state.maxPrice"
        class="w-24"
        :min="state.minPrice ?? 0"
        @change="submit"
      />
    </UFormField>
  </div>
</template>

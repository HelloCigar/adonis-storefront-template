<script setup lang="ts">
import { ref, watch } from 'vue'
import { useCollection } from '~/composables/collection'

const props = defineProps<{ vendors: string[] }>()
const { query, setFilters } = useCollection()
const value = ref([...query.value.vendor])
watch(query, (params) => {
  value.value = [...params.vendor]
})
</script>
<template>
  <UCheckboxGroup
    v-model="value"
    :items="props.vendors"
    @update:model-value="(vendor) => setFilters({ vendor })"
  />
</template>

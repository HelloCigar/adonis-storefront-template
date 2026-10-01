<script setup lang="ts">
import { useCollection } from '~/composables/collection'

const { query, setFilters } = useCollection()
</script>
<template>
  <USwitch
    :model-value="query.available === true"
    label="In stock"
    @update:model-value="(checked) => setFilters({ available: checked ? true : undefined })"
  />
</template>

<script setup lang="ts">
import type { ProductOption } from '~/types/store'
const props = defineProps<{
  option: ProductOption
}>()

const state = defineModel<string>()
</script>
<template>
  <URadioGroup
    v-model="state"
    variant="card"
    indicator="hidden"
    :ui="{ fieldset: 'flex-row flex-wrap gap-2' }"
    :items="
      props.option.optionValues.map((value) => ({
        label: value.name,
        value: value.name,
        disabled: value.disabled,
      }))
    "
  />
</template>

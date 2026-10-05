<script setup lang="ts">
import type { Period } from '../../types'

const model = defineModel<Period>({ required: true })

defineProps<{
  periods: Period[]
}>()
</script>

<template>
  <USelect
    v-model="model"
    :items="periods"
    variant="ghost"
    class="data-[state=open]:bg-elevated"
    :ui="{
      value: 'capitalize',
      itemLabel: 'capitalize',
      trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200',
    }"
  />
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { ProductOption } from '~/types/store'
import ProductOptionSwatchColor from '~/components/product/option/swatch/Color.vue'
import ProductOptionSwatchImage from '~/components/product/option/swatch/Image.vue'
import ProductOptionSwatchText from '~/components/product/option/swatch/Text.vue'
const props = defineProps<{
  options: ProductOption[]
}>()

const selectedOptions = defineModel<{ name: string; value: string }[]>()

const optionsToState = (options?: { name: string; value: string }[]) =>
  options?.reduce(
    (acc, option) => {
      acc[option.name] = option.value

      return acc
    },
    {} as Record<string, string>
  ) ?? {}

const stateToOptions = (state: Record<string, string>) =>
  Object.entries(state).map(([name, value]) => ({ name, value }))

const state = reactive(optionsToState(selectedOptions.value))
watch(selectedOptions, (options) => {
  for (const key of Object.keys(state)) delete state[key]
  Object.assign(state, optionsToState(options))
})

const onChange = () => (selectedOptions.value = stateToOptions(state))

const isColorSwatchOption = (option?: (typeof props.options)[number]) =>
  !!option?.optionValues?.every((value) => value.swatch?.color)

const isImageSwatchOption = (option?: (typeof props.options)[number]) =>
  !!option?.optionValues?.every((value) => value.swatch?.image?.previewImage?.url)

const getFilterComponent = (option: (typeof props.options)[number]) => {
  if (isColorSwatchOption(option)) return ProductOptionSwatchColor
  if (isImageSwatchOption(option)) return ProductOptionSwatchImage

  return ProductOptionSwatchText
}
</script>
<template>
  <div>
    <UFormField
      v-for="option in props.options.filter((option) => option.optionValues.length > 1)"
      :key="option.id"
      :label="option.name"
      :name="option.name"
      class="mb-6 lg:mb-8"
    >
      <component
        :is="getFilterComponent(option)"
        v-model="state[option.name]"
        :option="option"
        @update:model-value="onChange"
      />
    </UFormField>
  </div>
</template>

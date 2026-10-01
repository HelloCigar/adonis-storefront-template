<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { ProductOption, Variant } from '~/types/store'
import ProductOptionSwatchColor from '~/components/product/option/swatch/Color.vue'
import ProductOptionSwatchImage from '~/components/product/option/swatch/Image.vue'
import ProductOptionSwatchText from '~/components/product/option/swatch/Text.vue'
const props = defineProps<{
  options: ProductOption[]
  variants: Variant[]
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

const state = reactive(optionsToState(selectedOptions.value))
watch(selectedOptions, (options) => {
  for (const key of Object.keys(state)) delete state[key]
  Object.assign(state, optionsToState(options))
})

const availableVariants = (name: string, value: string) => {
  const index = props.options.findIndex((option) => option.name === name)
  const prefix = props.options.slice(0, index + 1)
  return props.variants.filter(
    (variant) =>
      variant.availableForSale &&
      prefix.every((option) =>
        variant.selectedOptions.some(
          (selected) =>
            selected.name === option.name &&
            selected.value === (option.name === name ? value : state[option.name])
        )
      )
  )
}

const options = computed(() =>
  props.options.map((option) => ({
    ...option,
    optionValues: option.optionValues.map((value) => ({
      ...value,
      disabled: availableVariants(option.name, value.name).length === 0,
    })),
  }))
)

const onChange = (name: string, value: string | undefined) => {
  if (value === undefined) return
  const candidates = availableVariants(name, value)
  const variant =
    candidates.find((candidate) =>
      candidate.selectedOptions.every((option) => state[option.name] === option.value)
    ) ?? candidates[0]
  if (variant) selectedOptions.value = [...variant.selectedOptions]
}

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
      v-for="option in options.filter((option) => option.optionValues.length > 1)"
      :key="option.id"
      :label="option.name"
      :name="option.name"
      class="mb-6 lg:mb-8"
    >
      <component
        :is="getFilterComponent(option)"
        v-model="state[option.name]"
        :option="option"
        @update:model-value="(value: string | undefined) => onChange(option.name, value)"
      />
    </UFormField>
  </div>
</template>

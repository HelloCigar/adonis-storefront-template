<script setup lang="ts">
import type { Data } from '@generated/data'
import { computed, ref, reactive, watch } from 'vue'
import { t } from '~/utils/store'
import type { Variant } from '~/types/store'
import { isLowStock } from '~/utils/product'
import { useCart } from '~/composables/cart'
import ProductPrice from '~/components/product/Price.vue'
import ProductOptionGroup from '~/components/product/option/Group.vue'
import type { FormSubmitEvent } from '@nuxt/ui'
const props = defineProps<{ product?: Data.Product }>()
const selectedVariant = defineModel<Variant>()
const emit = defineEmits<{ submit: [FormSubmitEvent<typeof state>] }>()
const { add } = useCart()
const state = reactive({
  quantity: 1,
  selectedOptions: selectedVariant.value?.selectedOptions ?? [],
})
const product = computed(() => props.product)
const loading = ref(false)
const unavailable = computed(
  () => !props.product?.availableForSale || !selectedVariant.value?.availableForSale
)
const lowStock = computed(() => isLowStock(selectedVariant.value))
const subscription = false
const maxQuantity = computed(() => {
  const quantity = selectedVariant.value?.quantityAvailable
  return quantity && quantity > 0 ? Math.min(quantity, 10) : 10
})
watch(
  () => state.selectedOptions,
  (options) => {
    selectedVariant.value = props.product?.variants?.find((variant) =>
      options.every((option) =>
        variant.selectedOptions.some(
          (value) => value.name === option.name && value.value === option.value
        )
      )
    )
  },
  { deep: true }
)
watch(selectedVariant, (variant) => {
  const options = variant?.selectedOptions ?? []
  if (JSON.stringify(state.selectedOptions) !== JSON.stringify(options))
    state.selectedOptions = [...options]
  state.quantity = Math.min(state.quantity, maxQuantity.value)
})
const onSubmit = async (event: FormSubmitEvent<typeof state>) => {
  if (!selectedVariant.value || unavailable.value) return
  loading.value = true
  try {
    if (await add(selectedVariant.value.id, event.data.quantity)) emit('submit', event)
  } finally {
    loading.value = false
  }
}
</script>
<template>
  <div>
    <div class="flex-col lg:flex pb-6 lg:pb-8">
      <h1 class="text-4xl lg:text-5xl font-extrabold mb-4">
        {{ selectedVariant?.product?.title }}
      </h1>

      <ProductPrice
        v-if="selectedVariant"
        :price="selectedVariant.price"
        :compare-at-price="selectedVariant.compareAtPrice"
        class="inline-block lg:text-lg lg:mb-0"
        discount
      />

      <div class="flex flex-wrap items-center gap-2 mt-4">
        <UBadge v-if="unavailable" color="neutral" variant="subtle" :label="t('product.soldOut')" />

        <UBadge
          v-else-if="lowStock"
          color="warning"
          variant="subtle"
          :label="t('product.lowStock', { count: selectedVariant?.quantityAvailable ?? 0 })"
        />

        <UBadge
          v-if="subscription"
          color="primary"
          variant="subtle"
          :label="t('product.subscription')"
        />

        <UBadge
          v-if="props.product?.isGiftCard"
          color="primary"
          variant="subtle"
          :label="t('product.giftCard')"
        />
      </div>
    </div>

    <USeparator class="mb-6 lg:mb-8" />

    <UForm v-if="product" :state="state" @submit="onSubmit">
      <ProductOptionGroup
        v-model="state.selectedOptions"
        :options="product.options"
        class="order-1 lg:order-2 mb-6 lg:mb-8"
      />

      <div class="flex justify-between items-center">
        <UFormField
          name="quantity"
          :label="t('product.quantity')"
          class="-mt-1"
          :ui="{ label: 'hidden' }"
        >
          <UInputNumber
            v-model="state.quantity"
            :min="1"
            :max="maxQuantity"
            class="w-24 lg:w-28"
            size="xl"
          />
        </UFormField>

        <UButton
          type="submit"
          size="xl"
          variant="subtle"
          :disabled="!selectedVariant || unavailable || loading"
          :trailing-icon="
            loading
              ? 'i-lucide-loader-circle'
              : unavailable
                ? 'i-lucide-ban'
                : 'i-lucide-shopping-bag'
          "
          :ui="{ trailingIcon: loading ? 'animate-spin size-5' : 'size-5' }"
          :label="unavailable ? t('product.soldOut') : t('product.add')"
        />
      </div>
    </UForm>
  </div>
</template>

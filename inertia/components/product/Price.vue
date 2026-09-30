<script setup lang="ts">
import { computed } from 'vue'
import { t } from '~/utils/store'
import type { Money } from '~/types/store'
import { discountPercentage, isDiscounted } from '~/utils/product'
import { useLocalization } from '~/composables/localization'
const props = defineProps<{
  price: Money
  compareAtPrice?: Money | null
  from?: boolean
  discount?: boolean
}>()

const { locale } = useLocalization()

const format = (money?: Money | null) => {
  if (!money?.currencyCode) return ''

  return new Intl.NumberFormat(locale.value, {
    style: 'currency',
    currency: money.currencyCode,
  }).format(Number(money.amount))
}

const price = computed(() => format(props.price))
const compareAtPrice = computed(() => format(props.compareAtPrice))

const discounted = computed(() => isDiscounted(props.price, props.compareAtPrice))
const percentage = computed(() => discountPercentage(props.price, props.compareAtPrice))
</script>
<template>
  <span class="inline-flex flex-wrap items-baseline gap-x-2">
    <span class="font-bold" :class="{ 'text-error': discounted }">
      <template v-if="from">
        {{ t('product.priceFrom', { price }) }}
      </template>

      <template v-else>
        {{ price }}
      </template>
    </span>

    <s v-if="discounted" class="text-sm text-muted font-normal">
      {{ compareAtPrice }}
    </s>

    <UBadge
      v-if="discounted && discount"
      color="error"
      variant="subtle"
      size="sm"
      :label="t('product.discount', { percentage })"
    />
  </span>
</template>

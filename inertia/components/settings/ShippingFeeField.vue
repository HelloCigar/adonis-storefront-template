<script setup lang="ts">
import type { Data } from '@generated/data'

defineProps<{
  shippingFee: Data.Settings.StoreSetting['shippingFee']
  error?: string
}>()
</script>

<template>
  <UFormField
    name="shippingFee"
    label="Shipping fee"
    :description="`Charged once per order, in pesos. Currently ${shippingFee.formatted}. Enter 0 for free shipping.`"
    :error="error"
    required
    class="flex max-sm:flex-col justify-between items-start gap-4"
  >
    <UInput
      name="shippingFee"
      inputmode="decimal"
      :default-value="String(shippingFee.raw)"
      class="w-full sm:w-40"
    />
  </UFormField>
</template>

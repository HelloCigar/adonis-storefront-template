<script setup lang="ts">
import { computed } from 'vue'
import type { Data } from '@generated/data'
import DiscountCode from '~/components/checkout/DiscountCode.vue'
import SummaryLines from '~/components/checkout/SummaryLines.vue'
const props = defineProps<{ quote: Data.Checkout.Quote; money: (amount: number) => string }>()
const lines = computed(() =>
  props.quote.lines.map((line) => ({
    key: line.variantId,
    title: line.title,
    detail: line.variantTitle,
    quantity: line.quantity,
    amount: props.money(line.totalAmount),
  }))
)
</script>
<template>
  <div>
    <SummaryLines :lines="lines" />
    <DiscountCode :discount="quote.discount" :error="quote.discountError" />
    <dl class="space-y-3 border-t border-default mt-5 pt-5 text-sm tabular-nums">
      <div class="flex justify-between">
        <dt class="text-muted">Subtotal</dt>
        <dd>{{ money(quote.subtotalMinor) }}</dd>
      </div>
      <div v-if="quote.discount" class="flex justify-between text-success">
        <dt>Discount ({{ quote.discount.code }})</dt>
        <dd>−{{ money(quote.discount.amountMinor) }}</dd>
      </div>
      <div class="flex justify-between">
        <dt class="text-muted">Shipping</dt>
        <dd>{{ money(quote.shippingMinor) }}</dd>
      </div>
      <div
        class="flex items-baseline justify-between border-t border-default pt-3 text-lg font-semibold text-highlighted"
      >
        <dt>Total</dt>
        <dd>{{ money(quote.totalMinor) }}</dd>
      </div>
    </dl>
  </div>
</template>

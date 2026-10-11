<script setup lang="ts">
import { computed } from 'vue'
import type { Data } from '@generated/data'

const props = defineProps<{ order: Data.Seller.Order }>()
type Address = Data.Checkout.OrderAddress
const addresses = computed(() => props.order.addresses ?? [])
const shipping = computed(
  () => addresses.value.find((address) => address.type === 'shipping') ?? null
)
const billing = computed(
  () => addresses.value.find((address) => address.type === 'billing') ?? null
)
const lines = (address: Address) => address.formatted?.filter(Boolean) ?? []
const same = (a: Address, b: Address) =>
  lines(a).join('\n') === lines(b).join('\n') && (a.phoneNumber ?? '') === (b.phoneNumber ?? '')
/** Billing is listed only when it adds something; most orders bill and ship to one address. */
const shown = computed(() => {
  if (shipping.value && billing.value && same(shipping.value, billing.value))
    return [{ title: 'Ship and bill to', address: shipping.value }]
  return [
    ...(shipping.value ? [{ title: 'Ship to', address: shipping.value }] : []),
    ...(billing.value ? [{ title: 'Bill to', address: billing.value }] : []),
    ...addresses.value
      .filter((address) => !['shipping', 'billing'].includes(address.type))
      .map((address) => ({ title: 'Address', address })),
  ]
})
</script>

<template>
  <section aria-labelledby="order-customer-title">
    <h2 id="order-customer-title" class="text-lg font-semibold text-highlighted">Customer</h2>
    <p class="text-sm mt-3 [overflow-wrap:anywhere]">
      <bdi>{{ order.email || 'No email recorded' }}</bdi>
    </p>
    <p v-if="order.phoneNumber" class="text-sm mt-1 [overflow-wrap:anywhere]">
      <bdi>{{ order.phoneNumber }}</bdi>
    </p>
    <div v-for="entry in shown" :key="entry.address.id" class="mt-5">
      <h3 class="text-sm font-semibold text-highlighted mb-1.5">{{ entry.title }}</h3>
      <address class="not-italic text-sm text-default [overflow-wrap:anywhere]">
        <span v-for="(line, index) in lines(entry.address)" :key="index" class="block">{{
          line
        }}</span>
        <span v-if="entry.address.phoneNumber" class="block mt-1"
          ><bdi>{{ entry.address.phoneNumber }}</bdi></span
        >
      </address>
    </div>
    <p v-if="!addresses.length" class="text-sm text-muted mt-5">
      No address is recorded for this order.
    </p>
  </section>
</template>

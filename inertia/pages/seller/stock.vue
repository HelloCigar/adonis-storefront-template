<script setup lang="ts">
import { computed } from 'vue'
import { Head } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import AdjustForm from '~/components/seller/stock/AdjustForm.vue'
import History from '~/components/seller/stock/History.vue'
const props = defineProps<{
  product: Data.Seller.Product
  variant: Data.Seller.Variant
  reasons: string[]
  adjustments: {
    data: Data.Seller.StockAdjustment[]
    metadata: { total: number; perPage: number; currentPage: number }
  }
}>()
const tracked = computed(() => props.variant.inventoryQuantity !== null)
const stats = computed(() => {
  const onHand = props.variant.inventoryQuantity ?? 0
  const held = props.variant.inventoryReservedQuantity
  return [
    { label: 'On hand', value: onHand },
    { label: 'Held by pending orders', value: held },
    { label: 'Available to sell', value: Math.max(0, onHand - held) },
  ]
})
</script>

<template>
  <Head :title="`${variant.title} stock`" />
  <UDashboardPanel id="stock">
    <template #header>
      <UDashboardNavbar title="Stock">
        <template #leading><UDashboardSidebarCollapse /></template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div>
        <Link
          route="seller.products.show"
          :params="{ id: product.id }"
          class="inline-flex items-center gap-1 text-sm text-primary mb-3"
          ><UIcon name="i-lucide-arrow-left" class="size-4" />{{ product.title }}</Link
        >
        <h1 class="text-2xl font-semibold text-highlighted [overflow-wrap:anywhere]">
          {{ variant.title }}
        </h1>
        <p class="mt-2 text-sm text-muted">
          {{ product.title }}<span v-if="variant.sku"> · SKU {{ variant.sku }}</span>
        </p>
      </div>
      <UAlert
        v-if="!tracked"
        color="neutral"
        variant="subtle"
        icon="i-lucide-infinity"
        title="Stock is not tracked for this variant"
        description="Edit the variant and enter a stock quantity to start tracking. Untracked variants never sell out."
      />
      <template v-else>
        <dl class="grid gap-3 sm:grid-cols-3">
          <div
            v-for="stat in stats"
            :key="stat.label"
            class="rounded-lg border border-default bg-elevated/50 p-4"
          >
            <dt class="text-sm text-muted">{{ stat.label }}</dt>
            <dd class="mt-1 text-2xl font-semibold text-highlighted tabular-nums">
              {{ stat.value }}
            </dd>
          </div>
        </dl>
        <UAlert
          v-if="!variant.availableForSale"
          color="warning"
          variant="subtle"
          icon="i-lucide-eye-off"
          title="This variant is not available for sale"
          description="Adjusting stock does not change availability. Edit the variant to sell it again."
        />
        <section class="rounded-lg bg-elevated/50 p-5 sm:p-6 max-w-3xl">
          <AdjustForm :product-id="product.id" :variant="variant" :reasons="reasons" />
        </section>
      </template>
      <History :product-id="product.id" :variant-id="variant.id" :adjustments="adjustments" />
    </template>
  </UDashboardPanel>
</template>

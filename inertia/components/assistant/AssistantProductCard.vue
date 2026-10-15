<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'

defineProps<{ product: Data.Assistant.AssistantProduct }>()
</script>

<template>
  <div
    data-testid="assistant-product-card"
    class="flex w-40 shrink-0 flex-col gap-2 rounded-md border border-default p-2"
  >
    <img
      v-if="product.image"
      :src="product.image"
      :alt="product.title"
      class="aspect-square w-full rounded object-cover"
    />
    <Link
      route="products.show"
      :params="{ handle: product.handle }"
      class="line-clamp-2 text-sm font-medium text-highlighted hover:underline"
    >
      {{ product.title }}
    </Link>
    <p class="text-sm">{{ product.price.formatted }}</p>
    <UBadge
      :label="product.availability === 'in_stock' ? 'In stock' : 'Out of stock'"
      :color="product.availability === 'in_stock' ? 'success' : 'neutral'"
      variant="subtle"
      size="sm"
      class="w-fit"
    />
  </div>
</template>

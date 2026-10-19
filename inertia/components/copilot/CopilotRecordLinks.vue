<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'

defineProps<{ orders: { id: string; number: string }[] }>()
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <Link
      v-for="order in orders"
      :key="order.id"
      route="seller.orders.show"
      :params="{ id: order.id }"
      class="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
    >
      <UIcon name="i-lucide-package" class="size-4" aria-hidden="true" />{{ order.number }}
    </Link>
  </div>
</template>

<script setup lang="ts">
import type { Data } from '@generated/data'
import AssistantProductCard from '~/components/assistant/AssistantProductCard.vue'

defineProps<{ products: Data.Assistant.AssistantProduct[] }>()
</script>

<template>
  <div class="flex gap-2 overflow-x-auto pb-1">
    <AssistantProductCard v-for="product in products" :key="product.id" :product="product" />
  </div>
</template>

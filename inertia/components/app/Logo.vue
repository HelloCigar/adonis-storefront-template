<script setup lang="ts">
import { urlFor } from '~/client'
const logo = { url: '/store-logo.svg', altText: 'Nuxt Shopify Store Logo' }
</script>
<template>
  <ULink :to="urlFor('home')" class="flex items-center gap-1 mr-4 shrink-0 font-bold">
    <img
      :src="logo?.url"
      :alt="logo?.altText || 'Nuxt Shopify Store Logo'"
      class="h-7 w-auto mb-0.5"
      width="50"
      height="50"
      loading="eager"
      fetchpriority="high"
    />

    <span class="text-primary">Nuxt</span> Shopify
  </ULink>
</template>

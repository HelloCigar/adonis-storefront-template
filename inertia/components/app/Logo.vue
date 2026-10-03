<script setup lang="ts">
import { urlFor } from '~/client'
</script>
<template>
  <ULink
    :to="urlFor('home')"
    aria-label="Nuxt Shopify"
    class="flex items-center gap-1 sm:mr-4 shrink-0 font-bold"
  >
    <span
      role="img"
      aria-label="Nuxt Shopify Store Logo"
      class="size-7 mb-0.5 bg-primary [mask:url('/store-logo.svg')_center/contain_no-repeat]"
    />

    <span class="hidden sm:inline"><span class="text-primary">Nuxt</span> Shopify</span>
  </ULink>
</template>

<script setup lang="ts">
import AppFooter from '~/components/app/Footer.vue'
import AppHeader from '~/components/app/Header.vue'
import { provideCart } from '~/composables/cart'

provideCart()
</script>
<template>
  <div>
    <AppHeader />

    <UMain>
      <slot />
    </UMain>

    <AppFooter />
  </div>
</template>

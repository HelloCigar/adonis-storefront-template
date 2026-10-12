<script setup lang="ts">
import AppFooter from '~/components/app/Footer.vue'
import AppHeader from '~/components/app/Header.vue'
import { provideCart } from '~/composables/cart'
import PasskeySignals from '~/components/passkey_signals.vue'

provideCart()
</script>
<template>
  <div>
    <AppHeader />

    <UMain>
      <slot />
    </UMain>

    <AppFooter />
    <PasskeySignals />
  </div>
</template>

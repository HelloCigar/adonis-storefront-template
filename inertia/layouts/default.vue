<script setup lang="ts">
import AppFooter from '~/components/app/Footer.vue'
import AppHeader from '~/components/app/Header.vue'
import { provideCart } from '~/composables/cart'
import { provideShoppingAssistant } from '~/composables/shoppingAssistant'
import PasskeySignals from '~/components/passkey_signals.vue'
import ShoppingAssistant from '~/components/assistant/ShoppingAssistant.vue'

provideCart()
provideShoppingAssistant()
</script>
<template>
  <div>
    <AppHeader />

    <UMain>
      <slot />
    </UMain>

    <AppFooter />
    <ShoppingAssistant />
    <PasskeySignals />
  </div>
</template>

<script setup lang="ts">
import AppFooter from '~/components/app/Footer.vue'
import AppHeader from '~/components/app/Header.vue'
import { provideCart } from '~/composables/cart'
import { provideShoppingAssistant } from '~/composables/shoppingAssistant'
import PasskeySignals from '~/components/passkey_signals.vue'
import FlashToasts from '~/components/flash_toasts.vue'
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
    <FlashToasts />
  </div>
</template>

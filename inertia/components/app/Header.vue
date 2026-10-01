<script setup lang="ts">
import { t } from '~/utils/store'
import { useMenu } from '~/composables/menu'
import AccountMenu from '~/components/account/Menu.vue'
import AppLocaleSelect from '~/components/app/LocaleSelect.vue'
import AppLogo from '~/components/app/Logo.vue'
import CartModal from '~/components/cart/Modal.vue'
import SearchModal from '~/components/search/Modal.vue'
const { data: items } = useMenu('main-menu')
</script>
<template>
  <UHeader title="Nuxt Shopify">
    <template #left>
      <AppLogo />
    </template>

    <UNavigationMenu :items="items ?? []" />

    <template #body>
      <UNavigationMenu :items="items ?? []" orientation="vertical" />
    </template>

    <template #right>
      <SearchModal />

      <AccountMenu />

      <AppLocaleSelect>
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-languages"
          :aria-label="t('localization.title')"
        />
      </AppLocaleSelect>

      <CartModal />

      <UColorModeButton />
    </template>
  </UHeader>
</template>

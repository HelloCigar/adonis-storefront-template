<script setup lang="ts">
import { urlFor } from '~/client'
import type { Data } from '@generated/data'
import { t } from '~/utils/store'
import AccountNav from '~/components/account/AccountNav.vue'
import AccountOrders from '~/components/account/Orders.vue'
import { Head } from '@inertiajs/vue3'
defineProps<{ orders: Data.Checkout.Order[] }>()
</script>
<template>
  <Head :title="t('account.orders.title')" />
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb
      :items="[
        { label: t('account.label'), to: urlFor('account.show') },
        { label: t('account.nav.orders') },
      ]"
      class="mb-6 lg:mb-8"
    />

    <AccountNav />

    <AccountOrders :orders="orders" />
  </UContainer>
</template>

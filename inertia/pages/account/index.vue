<script setup lang="ts">
import { urlFor } from '~/client'
import type { Data } from '@generated/data'
import { computed } from 'vue'
import { t } from '~/utils/store'
import AccountAddresses from '~/components/account/Addresses.vue'
import AccountOrders from '~/components/account/Orders.vue'
import AccountProfile from '~/components/account/Profile.vue'
import ProductSlider from '~/components/product/Slider.vue'
import { Head } from '@inertiajs/vue3'
const props = defineProps<{
  customer: Data.User
  recentOrders: Data.Order[]
  recommendedProducts: Data.Product[]
}>()
const orders = computed(() => props.recentOrders)
const addresses = computed(() => props.customer.addresses ?? [])
const name = computed(() =>
  [props.customer.firstName, props.customer.lastName].filter(Boolean).join(' ')
)
</script>
<template>
  <Head :title="t('account.label')" />
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb :items="[{ label: t('account.label') }]" class="mb-6 lg:mb-8" />

    <template v-if="customer">
      <div class="flex flex-wrap items-center justify-between gap-4 mb-8 lg:mb-10">
        <h1 class="text-4xl lg:text-5xl text-highlighted font-extrabold">
          {{ name ? t('account.greeting', { name }) : t('account.welcome') }}
        </h1>

        <UButton
          :to="urlFor('account.logout')"
          variant="outline"
          color="neutral"
          size="lg"
          :label="t('account.logout')"
          icon="i-lucide-log-out"
        />
      </div>

      <div class="flex flex-col gap-10 lg:gap-14">
        <section>
          <h2 class="text-2xl lg:text-3xl text-highlighted font-bold mb-6 lg:mb-8">
            {{ t('account.profile.title') }}
          </h2>

          <AccountProfile :customer="customer" />
        </section>

        <div>
          <AccountOrders :orders="orders" />

          <div v-if="orders?.length" class="mt-6 flex justify-center">
            <UButton
              :to="urlFor('orders.index')"
              variant="soft"
              size="lg"
              :label="t('account.orders.viewAll')"
              trailing-icon="i-lucide-arrow-right"
            />
          </div>
        </div>

        <AccountAddresses
          :addresses="addresses"
          :default-address-id="customer.defaultAddress?.id"
        />

        <section>
          <h2 class="text-2xl lg:text-3xl text-highlighted font-bold mb-6 lg:mb-8">
            {{ t('account.recommended') }}
          </h2>

          <ProductSlider :first="8" :products="recommendedProducts" loading="lazy" />
        </section>
      </div>
    </template>

    <div v-else class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-muted" />
    </div>
  </UContainer>
</template>

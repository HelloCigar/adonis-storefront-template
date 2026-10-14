<script setup lang="ts">
import { urlFor } from '~/client'
import type { Data } from '@generated/data'
import { computed } from 'vue'
import { t } from '~/utils/store'
import AccountNav from '~/components/account/AccountNav.vue'
import AccountOrders from '~/components/account/Orders.vue'
import ProductSlider from '~/components/product/Slider.vue'
import { Head } from '@inertiajs/vue3'
const props = defineProps<{
  customer: Data.Account.User
  recentOrders: Data.Checkout.Order[]
  recommendedProducts: Data.Catalog.Product[]
}>()
const orders = computed(() => props.recentOrders)
const fields = computed(() => [
  {
    icon: 'i-lucide-user-round',
    label: t('account.profile.name'),
    value:
      [props.customer.firstName, props.customer.lastName].filter(Boolean).join(' ') ||
      props.customer.fullName,
  },
  {
    icon: 'i-lucide-mail',
    label: t('account.profile.email'),
    value: props.customer.email,
  },
  {
    icon: 'i-lucide-phone',
    label: t('account.profile.phone'),
    value: props.customer.phoneNumber?.phoneNumber,
  },
  {
    icon: 'i-lucide-map-pin',
    label: t('account.profile.address'),
    value: props.customer.defaultAddress?.formatted.join(', '),
  },
])
</script>
<template>
  <Head :title="t('account.label')" />
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb :items="[{ label: t('account.label') }]" class="mb-6 lg:mb-8" />

    <AccountNav />

    <div class="flex flex-col gap-10 lg:gap-14">
      <section>
        <div class="flex flex-wrap items-center justify-between gap-4 mb-6 lg:mb-8">
          <h2 class="text-2xl lg:text-3xl text-highlighted font-bold">
            {{ t('account.profile.title') }}
          </h2>

          <UButton
            :to="urlFor('account.profile.show')"
            variant="soft"
            color="neutral"
            icon="i-lucide-pencil"
            :label="t('account.profile.edit')"
          />
        </div>

        <UCard :ui="{ body: 'grid gap-6 sm:grid-cols-2' }">
          <div v-for="field in fields" :key="field.label" class="flex items-start gap-3">
            <UIcon :name="field.icon" class="size-5 mt-0.5 text-muted shrink-0" />

            <div class="min-w-0">
              <p class="text-sm text-muted">
                {{ field.label }}
              </p>

              <p class="font-medium wrap-break-word">
                {{ field.value || t('account.profile.empty') }}
              </p>
            </div>
          </div>
        </UCard>
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

      <section>
        <h2 class="text-2xl lg:text-3xl text-highlighted font-bold mb-6 lg:mb-8">
          {{ t('account.recommended') }}
        </h2>

        <ProductSlider :first="8" :products="recommendedProducts" loading="lazy" />
      </section>
    </div>
  </UContainer>
</template>

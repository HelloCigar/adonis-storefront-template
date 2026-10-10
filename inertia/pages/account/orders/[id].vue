<script setup lang="ts">
import { urlFor } from '~/client'
import type { Data } from '@generated/data'
import { computed } from 'vue'
import { t } from '~/utils/store'
import type { Money } from '~/types/store'
import { useLocalization } from '~/composables/localization'
import { statusColor, statusLabel } from '~/utils/status'
import { Head } from '@inertiajs/vue3'
import OrderChat from '~/components/chat/OrderChat.vue'
const props = defineProps<{
  order: Data.Checkout.Order
  conversation?: Data.Chat.Conversation | null
}>()
const { locale } = useLocalization()
const items = computed(() => props.order.lineItems ?? [])
const date = computed(() =>
  props.order.processedAt
    ? new Intl.DateTimeFormat(locale.value, { dateStyle: 'long' }).format(
        new Date(props.order.processedAt)
      )
    : ''
)
const money = (value?: Money | null) =>
  value
    ? new Intl.NumberFormat(locale.value, {
        style: 'currency',
        currency: value.currencyCode,
      }).format(Number(value.amount))
    : undefined
const totals = computed(() =>
  [
    { label: t('account.orders.detail.subtotal'), value: money(props.order.subtotal) },
    {
      label: props.order.discountCode
        ? `${t('account.orders.detail.discount')} (${props.order.discountCode})`
        : t('account.orders.detail.discount'),
      value:
        props.order.discountAmount > 0
          ? `−${money({ amount: props.order.discountAmount, currencyCode: props.order.currencyCode })}`
          : undefined,
    },
    { label: t('account.orders.detail.shipping'), value: money(props.order.totalShipping) },
    { label: t('account.orders.detail.tax'), value: money(props.order.totalTax) },
  ].filter((row) => row.value)
)
const addresses = computed(() =>
  [
    {
      label: t('account.orders.detail.shippingAddress'),
      value: props.order.shippingAddress?.formatted,
    },
    {
      label: t('account.orders.detail.billingAddress'),
      value: props.order.billingAddress?.formatted,
    },
  ].filter((entry) => entry.value?.length)
)
</script>
<template>
  <Head :title="order.name" />
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb
      :items="[
        { label: t('account.label'), to: urlFor('account.show') },
        { label: t('account.orders.title'), to: urlFor('orders.index') },
        { label: order?.name },
      ]"
      class="mb-6 lg:mb-8"
    />

    <div class="flex flex-wrap items-start justify-between gap-4 mb-8 lg:mb-10">
      <div>
        <h1 class="text-4xl lg:text-5xl text-highlighted font-extrabold mb-3">
          {{ order?.name }}
        </h1>

        <p class="text-muted mb-3">
          {{ t('account.orders.detail.placed', { date }) }}
        </p>

        <div class="flex items-center gap-2">
          <UBadge
            v-if="order?.financialStatus"
            :color="statusColor('payment', order.financialStatus)"
            variant="subtle"
            :label="statusLabel('payment', order.financialStatus)"
          />

          <UBadge
            v-if="order?.fulfillmentStatus"
            :color="statusColor('fulfillment', order.fulfillmentStatus)"
            variant="subtle"
            :label="statusLabel('fulfillment', order.fulfillmentStatus)"
          />
        </div>
      </div>

      <div class="flex flex-wrap"></div>
    </div>

    <div class="grid gap-8 lg:grid-cols-3 lg:gap-10">
      <section class="lg:col-span-2">
        <h2 class="text-2xl lg:text-3xl text-highlighted font-bold mb-6">
          {{ t('account.orders.detail.items') }}
        </h2>

        <UCard :ui="{ body: 'divide-y divide-default' }">
          <div
            v-for="item in items"
            :key="item.id"
            class="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
          >
            <img
              :src="item.image?.url"
              :alt="item.image?.altText ?? item.title ?? ''"
              width="128"
              height="128"
              class="size-16 rounded-md bg-elevated object-cover shrink-0"
            />

            <div class="min-w-0 grow">
              <p class="font-medium wrap-break-word">
                {{ item.title }}
              </p>

              <p v-if="item.variantTitle" class="text-sm text-muted">
                {{ item.variantTitle }}
              </p>

              <p class="text-sm text-muted">
                {{ t('account.orders.detail.quantity', { count: item.quantity }) }}
              </p>
            </div>

            <span class="font-medium whitespace-nowrap">
              {{ money(item.totalPrice) }}
            </span>
          </div>
        </UCard>
      </section>

      <div class="flex flex-col gap-8">
        <section>
          <h2 class="text-2xl lg:text-3xl text-highlighted font-bold mb-6">
            {{ t('account.orders.detail.summary') }}
          </h2>

          <UCard :ui="{ body: 'flex flex-col gap-3' }">
            <div v-for="row in totals" :key="row.label" class="flex justify-between gap-4 text-sm">
              <span class="text-muted">{{ row.label }}</span>
              <span>{{ row.value }}</span>
            </div>

            <div class="flex justify-between gap-4 border-t border-default pt-3 font-bold">
              <span>{{ t('account.orders.detail.total') }}</span>
              <span>{{ money(order?.totalPrice) }}</span>
            </div>
          </UCard>
        </section>

        <section v-for="address in addresses" :key="address.label">
          <h2 class="text-lg text-highlighted font-bold mb-3">
            {{ address.label }}
          </h2>

          <UCard>
            <address class="not-italic text-sm text-muted">
              <span v-for="line in address.value" :key="line" class="block">
                {{ line }}
              </span>
            </address>
          </UCard>
        </section>
      </div>
    </div>

    <section v-if="conversation" class="mt-8 lg:mt-10">
      <h2 class="text-2xl lg:text-3xl text-highlighted font-bold mb-6">Messages</h2>
      <UCard :ui="{ body: 'p-0 sm:p-0 flex flex-col h-[28rem]' }">
        <OrderChat :conversation="conversation" side="customer" />
      </UCard>
    </section>
  </UContainer>
</template>

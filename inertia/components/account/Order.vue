<script setup lang="ts">
import type { Data } from '@generated/data'
import { computed } from 'vue'
import { t } from '~/utils/store'
import { Link } from '@adonisjs/inertia/vue'
import { useLocalization } from '~/composables/localization'
import type { BadgeProps } from '@nuxt/ui'

const props = defineProps<{
  order: Data.Checkout.Order
}>()

const { locale } = useLocalization()

const items = computed(() => props.order.lineItems ?? [])

const date = computed(() =>
  props.order.processedAt
    ? new Intl.DateTimeFormat(locale.value, {
        dateStyle: 'medium',
      }).format(new Date(props.order.processedAt))
    : ''
)

const total = computed(() =>
  new Intl.NumberFormat(locale.value, {
    style: 'currency',
    currency: props.order.totalPrice.currencyCode,
  }).format(Number(props.order.totalPrice.amount))
)

const status = computed(() => props.order.financialStatus)

const colors: Record<string, BadgeProps['color']> = {
  PAID: 'success',
  PENDING: 'warning',
  AUTHORIZED: 'warning',
  PARTIALLY_PAID: 'warning',
  PARTIALLY_REFUNDED: 'neutral',
  REFUNDED: 'neutral',
  VOIDED: 'error',
  EXPIRED: 'error',
}
</script>
<template>
  <UCard :ui="{ body: 'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between' }">
    <div class="flex items-center gap-4">
      <div class="flex -space-x-3">
        <img
          v-for="item in items"
          :key="item.id"
          :src="item.image?.url"
          :alt="item.image?.altText ?? item.title ?? ''"
          width="96"
          height="96"
          class="size-12 rounded-md ring-2 ring-default bg-elevated object-cover"
        />
      </div>

      <div>
        <p class="font-medium">
          {{ order.name }}
        </p>

        <p class="text-sm text-muted">
          {{ date }} &middot; {{ t('account.orders.items', { count: items.length }) }}
        </p>
      </div>
    </div>

    <div class="flex items-center justify-between gap-4 sm:justify-end">
      <UBadge
        v-if="status"
        :color="colors[status] ?? 'neutral'"
        variant="subtle"
        :label="t(`account.orders.status.${status}`)"
      />

      <span class="font-bold">
        {{ total }}
      </span>

      <Link
        route="orders.show"
        view-transition
        :params="{ id: order.id }"
        component="account/orders/[id]"
        :page-props="{ order }"
        class="rounded-md focus-visible:outline-2 focus-visible:outline-primary"
      >
        <UButton
          as="span"
          variant="ghost"
          color="neutral"
          :label="t('account.orders.view')"
          trailing-icon="i-lucide-arrow-right"
          :ui="{ trailingIcon: 'size-4' }"
        />
      </Link>
    </div>
  </UCard>
</template>

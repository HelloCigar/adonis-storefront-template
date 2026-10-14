<script setup lang="ts">
import { ref } from 'vue'
import { Head, usePage } from '@inertiajs/vue3'
import { Form, Link } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import { urlFor } from '~/client'
import AddressFields from '~/components/checkout/AddressFields.vue'
import CheckoutSteps from '~/components/checkout/Steps.vue'
import OrderSummary from '~/components/checkout/OrderSummary.vue'
defineProps<{ quote: Data.Checkout.Quote | null; checkoutError: string | null }>()
const page = usePage()
const sameBilling = ref(true)
const summaryOpen = ref(false)
const money = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount / 100)
</script>
<template>
  <Head title="Checkout" />
  <UContainer class="py-8 lg:py-12 max-w-6xl">
    <Link
      route="home"
      class="inline-flex items-center gap-2 text-sm text-muted hover:text-default mb-6"
    >
      <UIcon name="i-lucide-arrow-left" />Continue shopping
    </Link>
    <div
      class="flex flex-col gap-4 mb-8 md:flex-row md:items-end md:justify-between lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_24rem]"
    >
      <div>
        <h1 class="text-3xl font-semibold text-highlighted mb-2">Checkout</h1>
        <p class="text-muted">Enter your delivery details. No account is required.</p>
      </div>
      <CheckoutSteps v-if="quote" :current="0" />
    </div>
    <UEmpty
      v-if="!quote"
      icon="i-lucide-shopping-bag"
      :title="checkoutError || 'Your cart is empty'"
      :description="
        checkoutError ? undefined : 'Add something you like, then come back to check out.'
      "
      :actions="[{ label: 'Continue shopping', to: urlFor('home') }]"
      class="py-16"
    />
    <Form
      v-else
      v-slot="{ errors, processing }"
      route="checkout.store"
      class="grid gap-6 items-start lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_24rem]"
    >
      <input type="hidden" name="submissionKey" :value="quote.submissionKey" />
      <input type="hidden" name="cartVersion" :value="quote.cartVersion" />
      <input type="hidden" name="quoteFingerprint" :value="quote.fingerprint" />

      <UCollapsible
        v-model:open="summaryOpen"
        class="lg:hidden rounded-lg bg-elevated/50 ring ring-default"
        :ui="{ content: 'px-4 pb-4' }"
      >
        <button
          type="button"
          class="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm"
        >
          <span class="inline-flex items-center gap-2 font-medium text-primary">
            <UIcon name="i-lucide-shopping-bag" class="size-5" />
            {{ summaryOpen ? 'Hide' : 'Show' }} order summary
            <UIcon
              name="i-lucide-chevron-down"
              class="size-4 transition-transform duration-200"
              :class="{ 'rotate-180': summaryOpen }"
            />
          </span>
          <span class="text-base font-semibold text-highlighted tabular-nums">
            {{ money(quote.totalMinor) }}
          </span>
        </button>
        <template #content>
          <div class="border-t border-default pt-4">
            <OrderSummary :quote="quote" :money="money" />
          </div>
        </template>
      </UCollapsible>

      <div class="space-y-6">
        <UAlert
          v-if="errors.quoteFingerprint"
          color="error"
          variant="soft"
          icon="i-lucide-circle-alert"
          :title="errors.quoteFingerprint"
        />
        <UCard>
          <template #header>
            <h2 class="font-semibold text-highlighted">Contact</h2>
            <p class="text-sm text-muted mt-1">
              We’ll send your receipt and delivery updates here.
            </p>
          </template>
          <UFormField label="Email address" name="email" :error="errors.email" required>
            <UInput
              name="email"
              type="email"
              autocomplete="email"
              :default-value="page.props.user?.email || ''"
              required
              class="w-full"
            />
          </UFormField>
        </UCard>
        <UCard>
          <template #header>
            <h2 class="font-semibold text-highlighted">Delivery</h2>
            <p class="text-sm text-muted mt-1">
              Delivery within the Philippines · {{ money(quote.shippingMinor) }} per order
            </p>
          </template>
          <AddressFields prefix="shipping" :errors="errors" />
          <UFormField
            label="Order note"
            name="note"
            hint="Optional"
            :error="errors.note"
            class="mt-4"
          >
            <UTextarea name="note" :rows="3" maxlength="1000" autoresize class="w-full" />
          </UFormField>
        </UCard>
        <UCard>
          <template #header>
            <h2 class="font-semibold text-highlighted">Billing address</h2>
          </template>
          <UCheckbox v-model="sameBilling" label="Same as delivery address" />
          <AddressFields v-if="!sameBilling" prefix="billing" :errors="errors" class="mt-5" />
        </UCard>

        <div class="space-y-3 lg:hidden">
          <div class="flex items-baseline justify-between text-lg font-semibold text-highlighted">
            <span>Total</span>
            <span class="tabular-nums">{{ money(quote.totalMinor) }}</span>
          </div>
          <UButton
            type="submit"
            label="Continue to payment"
            icon="i-lucide-lock-keyhole"
            size="lg"
            block
            :loading="processing"
            :disabled="processing"
          />
          <p class="text-xs text-muted text-center">
            Your items are held for 15 minutes while you pay.
          </p>
        </div>
      </div>

      <aside class="hidden lg:block lg:sticky lg:top-[calc(var(--ui-header-height)+1.5rem)]">
        <UCard>
          <template #header>
            <h2 class="font-semibold text-highlighted">Order summary</h2>
          </template>
          <OrderSummary :quote="quote" :money="money" />
          <UButton
            type="submit"
            label="Continue to payment"
            icon="i-lucide-lock-keyhole"
            size="lg"
            block
            class="mt-6"
            :loading="processing"
            :disabled="processing"
          />
          <p class="text-xs text-muted text-center mt-3">
            Your items are held for 15 minutes while you pay.
          </p>
        </UCard>
      </aside>
    </Form>
  </UContainer>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Head, usePage } from '@inertiajs/vue3'
import { Form, Link } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import AddressFields from '~/components/checkout/AddressFields.vue'
defineProps<{ quote: Data.Checkout.Quote | null; checkoutError: string | null }>()
const page = usePage()
const separateBilling = ref(false)
const money = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount / 100)
</script>
<template>
  <Head title="Checkout" />
  <UContainer class="py-8 lg:py-12">
    <Link route="home" class="inline-flex items-center gap-2 text-sm text-muted mb-6">
      <UIcon name="i-lucide-arrow-left" />Continue shopping
    </Link>
    <h1 class="text-3xl font-semibold text-highlighted mb-2">Checkout</h1>
    <p class="text-muted mb-8">Enter your delivery details. No account is required.</p>
    <UAlert
      v-if="!quote"
      icon="i-lucide-shopping-bag"
      :title="checkoutError || 'Your cart is empty'"
      color="neutral"
    />
    <Form
      v-else
      v-slot="{ errors, processing }"
      route="checkout.store"
      class="grid lg:grid-cols-3 gap-8 items-start"
    >
      <input type="hidden" name="submissionKey" :value="quote.submissionKey" />
      <input type="hidden" name="cartVersion" :value="quote.cartVersion" />
      <input type="hidden" name="quoteFingerprint" :value="quote.fingerprint" />
      <div class="lg:col-span-2 space-y-6">
        <UAlert v-if="errors.quoteFingerprint" color="error" :title="errors.quoteFingerprint" />
        <UCard>
          <template #header><h2 class="font-semibold">Contact</h2></template>
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
          <p class="text-xs text-muted mt-3">We’ll send your receipt and delivery updates here.</p>
        </UCard>
        <UCard>
          <template #header><h2 class="font-semibold">Delivery address</h2></template>
          <AddressFields prefix="shipping" :errors="errors" />
          <p class="text-sm text-muted mt-4">
            Delivery within the Philippines · {{ money(quote.shippingMinor) }} per order
          </p>
        </UCard>
        <UCard>
          <UCheckbox v-model="separateBilling" label="Use a different billing address" />
          <AddressFields v-if="separateBilling" prefix="billing" :errors="errors" class="mt-4" />
          <UFormField
            label="Order note"
            name="note"
            hint="Optional"
            :error="errors.note"
            class="mt-5"
          >
            <UTextarea name="note" :rows="3" maxlength="1000" class="w-full" />
          </UFormField>
        </UCard>
      </div>
      <UCard class="lg:sticky lg:top-6">
        <template #header><h2 class="font-semibold">Order summary</h2></template>
        <ul class="space-y-4">
          <li
            v-for="line in quote.lines"
            :key="line.variantId"
            class="flex justify-between gap-4 text-sm"
          >
            <div>
              <p class="font-medium">{{ line.title }}</p>
              <p class="text-muted">{{ line.variantTitle }} · Qty {{ line.quantity }}</p>
            </div>
            <span class="shrink-0">{{ money(line.totalAmount) }}</span>
          </li>
        </ul>
        <dl class="space-y-3 border-t border-default mt-5 pt-5 text-sm">
          <div class="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{{ money(quote.subtotalMinor) }}</dd>
          </div>
          <div class="flex justify-between">
            <dt>Shipping</dt>
            <dd>{{ money(quote.shippingMinor) }}</dd>
          </div>
          <div class="flex justify-between text-lg font-semibold">
            <dt>Total</dt>
            <dd>{{ money(quote.totalMinor) }}</dd>
          </div>
        </dl>
        <UButton
          type="submit"
          label="Continue to payment"
          icon="i-lucide-lock-keyhole"
          block
          class="mt-6"
          :loading="processing"
          :disabled="processing"
        />
        <p class="text-xs text-muted mt-3">Your items are held for 15 minutes while you pay.</p>
      </UCard>
    </Form>
  </UContainer>
</template>

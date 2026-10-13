<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import ReconcileCheckoutForm from './ReconcileCheckoutForm.vue'

type Issue = Data.Seller.OrderOperations['issues'][number]

defineProps<{ order: Data.Seller.Order; issue: Issue; otherIssues: Issue[] }>()
</script>

<template>
  <div>
    <ReconcileCheckoutForm
      v-if="issue.fix === 'reconcile_checkout' && order.attempt"
      :order="order"
      :attempt="order.attempt"
    />
    <a
      v-else-if="issue.fix === 'review_payment' || issue.fix === 'review_refunds'"
      href="#order-payments"
      class="inline-flex text-sm font-medium text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
      >{{ issue.fix === 'review_refunds' ? 'Go to refund records' : 'Go to payment records' }}</a
    >
    <ul v-else-if="issue.fix === 'check_stock' && issue.products.length" class="space-y-1.5">
      <li v-for="product in issue.products" :key="product.id">
        <Link
          route="seller.variants.index"
          :params="{ productId: product.id }"
          class="text-sm font-medium text-primary underline underline-offset-4 [overflow-wrap:anywhere] focus-visible:outline-2 focus-visible:outline-primary"
          >Check stock for {{ product.title }}</Link
        >
      </li>
    </ul>

    <section
      v-if="otherIssues.length"
      aria-labelledby="order-other-issues"
      class="mt-6 border-t border-default pt-5"
    >
      <h3 id="order-other-issues" class="text-sm font-semibold text-highlighted">
        Also blocking fulfillment
      </h3>
      <ul class="mt-3 space-y-4">
        <li v-for="other in otherIssues" :key="other.cause" class="flex gap-2.5">
          <UIcon
            name="i-lucide-triangle-alert"
            class="size-4 shrink-0 mt-0.5 text-warning"
            aria-hidden="true"
          />
          <div class="min-w-0 text-sm">
            <p class="font-medium text-highlighted">{{ other.title }}</p>
            <p class="text-default mt-0.5 max-w-prose">{{ other.detail }}</p>
            <a
              v-if="other.fix === 'review_payment' || other.fix === 'review_refunds'"
              href="#order-payments"
              class="inline-flex mt-1.5 font-medium text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
              >{{
                other.fix === 'review_refunds' ? 'Go to refund records' : 'Go to payment records'
              }}</a
            >
            <template v-else-if="other.fix === 'check_stock'">
              <Link
                v-for="product in other.products"
                :key="product.id"
                route="seller.variants.index"
                :params="{ productId: product.id }"
                class="block mt-1.5 font-medium text-primary underline underline-offset-4 [overflow-wrap:anywhere] focus-visible:outline-2 focus-visible:outline-primary"
                >Check stock for {{ product.title }}</Link
              >
            </template>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

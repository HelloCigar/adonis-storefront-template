<script setup lang="ts">
import { computed } from 'vue'
import type { Data } from '@generated/data'
import { orderLabel, orderMoney, operationMessage } from './presentation'
import { statusColor, statusLabel } from '~/utils/status'
import ReconcileCheckoutForm from './ReconcileCheckoutForm.vue'
import RefundRecheckForm from './RefundRecheckForm.vue'

const props = defineProps<{
  order: Data.Seller.Order
  operations: Data.Seller.OrderOperations
}>()
const money = (amount: number, currency = props.order.currencyCode) =>
  orderMoney(amount / 100, currency)
/** Mirrors the next action: it leads with a checkout recheck only while fulfillment is open. */
const nextActionReconciles = computed(() => {
  const order = props.order
  const settled =
    ['shipped', 'delivered'].includes(order.shipment?.state ?? '') ||
    ['cancelled', 'expired'].includes(order.lifecycleState) ||
    (order.lifecycleState === 'pending_payment' && !order.attempt?.needsReview) ||
    props.operations.cancellationPending
  return !settled && props.operations.issues[0]?.fix === 'reconcile_checkout'
})
const reconcilable = computed(
  () => !!props.order.attempt?.needsReview && props.order.attempt.state !== 'paid'
)
const paymentCurrency = (paymentId: string) =>
  props.order.payments.find((payment) => payment.id === paymentId)?.currency
</script>

<template>
  <section
    id="order-payments"
    aria-labelledby="order-payments-title"
    class="scroll-mt-6 border-t border-default pt-6"
  >
    <h2 id="order-payments-title" class="text-lg font-semibold text-highlighted mb-4">
      Payments &amp; refunds
    </h2>
    <div v-if="order.attempt" class="border-b border-default pb-5 mb-1">
      <div class="flex flex-wrap justify-between gap-2 text-sm">
        <h3 class="font-medium text-highlighted">Payment checkout</h3>
        <span class="text-muted"
          >{{ statusLabel('checkout', order.attempt.state) }} ·
          {{ orderLabel(order.attempt.provider) }}</span
        >
      </div>
      <p v-if="nextActionReconciles" class="text-sm text-default mt-3">
        This checkout needs a provider recheck. Use the form at the top of the page.
      </p>
      <template v-else-if="reconcilable">
        <p class="text-sm text-default mt-3">
          The provider’s result for this checkout is uncertain. Recheck it before relying on this
          order’s payment status.
        </p>
        <ReconcileCheckoutForm :order="order" :attempt="order.attempt" class="mt-4" />
      </template>
      <p v-else-if="order.attempt.needsReview" class="text-sm text-default mt-3">
        A payment is recorded, but this checkout still needs review. Verify the original provider
        record before continuing.
      </p>
      <p v-if="order.attempt.externalId" class="text-sm text-muted break-all mt-3">
        Checkout reference <bdi>{{ order.attempt.externalId }}</bdi>
      </p>
    </div>
    <p v-if="!order.payments.length" class="text-sm text-muted py-4">
      No captured payment is recorded. A checkout request is not payment confirmation.
    </p>
    <div
      v-for="payment in order.payments"
      :key="payment.id"
      class="py-4 border-b border-default last:border-b-0"
    >
      <div class="flex flex-wrap justify-between items-center gap-2">
        <h3 class="text-base font-semibold tabular-nums text-highlighted">
          Payment · {{ money(payment.amountMinor, payment.currency) }}
        </h3>
        <UBadge
          class="text-default"
          :label="payment.disposition === 'accepted' ? 'Paid' : orderLabel(payment.disposition)"
          :color="payment.disposition === 'accepted' ? 'success' : 'warning'"
          variant="subtle"
        />
      </div>
      <p class="text-sm text-muted break-all mt-2">
        {{ orderLabel(payment.provider) }} payment <bdi>{{ payment.externalId }}</bdi>
      </p>
    </div>
    <div v-for="refund in order.refunds" :key="refund.id" class="border-t border-default py-4">
      <div class="flex flex-wrap justify-between gap-2 text-sm">
        <h3 class="font-medium text-highlighted">
          Refund · {{ money(refund.amountMinor, paymentCurrency(refund.paymentId)) }}
        </h3>
        <UBadge
          class="text-default"
          :label="statusLabel('refund', refund.state)"
          :color="refund.needsReview ? 'warning' : statusColor('refund', refund.state)"
          variant="subtle"
        />
      </div>
      <p v-if="refund.externalId" class="text-sm text-muted break-all mt-2">
        Refund reference <bdi>{{ refund.externalId }}</bdi>
      </p>
      <p v-if="refund.lastError" class="text-sm text-default mt-2 break-words">
        {{ operationMessage(refund.lastError, 'refund') }}
      </p>
      <RefundRecheckForm
        v-if="refund.needsReview && !['succeeded', 'failed'].includes(refund.state)"
        :order-id="order.id"
        :refund-id="refund.id"
        class="mt-4"
      />
    </div>
    <div
      v-for="refund in operations.observedRefunds"
      :key="`observed-${refund.id}`"
      class="border-t border-default py-4"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-sm font-medium text-highlighted">
          Provider refund · {{ orderMoney(refund.amountMinor / 100, refund.currency) }}
        </h3>
        <UBadge
          :label="orderLabel(refund.state)"
          :color="refund.state === 'succeeded' ? 'success' : 'warning'"
          variant="subtle"
        />
      </div>
      <p class="text-sm text-muted mt-2">Reported directly by the payment provider.</p>
      <p class="text-sm text-muted break-all mt-2">
        Refund reference <bdi>{{ refund.externalId }}</bdi>
      </p>
    </div>
  </section>
</template>

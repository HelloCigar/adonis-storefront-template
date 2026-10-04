<script setup lang="ts">
import { computed } from 'vue'
import { Form } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
const props = defineProps<{ order: Data.Seller.Order }>()
const ready = computed(
  () =>
    props.order.lifecycleState === 'confirmed' &&
    props.order.financialStatus === 'paid' &&
    !props.order.attempt?.needsReview &&
    !props.order.refunds.some((refund) =>
      ['requested', 'pending', 'unknown'].includes(refund.state)
    )
)
const money = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount / 100)
</script>
<template>
  <div class="space-y-6">
    <UCard>
      <template #header><h2 class="font-semibold">Fulfillment</h2></template>
      <div class="flex gap-2 flex-wrap mb-4">
        <UBadge :label="order.lifecycleState" variant="subtle" />
        <UBadge
          :label="order.shipment?.state || 'Awaiting payment'"
          color="neutral"
          variant="subtle"
        />
      </div>
      <UAlert
        v-if="order.reviewReason || order.attempt?.needsReview"
        color="warning"
        title="Payment review required"
        :description="
          order.reviewReason || 'Reconcile this operation before dispatching the order.'
        "
        class="mb-4"
      />
      <Form
        v-if="ready && order.shipment?.state === 'pending'"
        v-slot="{ processing }"
        route="seller.packing.store"
        :params="{ id: order.id }"
      >
        <UButton
          type="submit"
          label="Start packing"
          icon="i-lucide-package"
          :loading="processing"
        />
      </Form>
      <Form
        v-if="ready && order.shipment?.state === 'packing'"
        v-slot="{ errors, processing }"
        route="seller.shipments.store"
        :params="{ id: order.id }"
        class="space-y-4"
      >
        <UFormField label="Carrier" name="carrier" :error="errors.carrier" required
          ><UInput name="carrier" required class="w-full"
        /></UFormField>
        <UFormField
          label="Tracking number"
          name="trackingNumber"
          :error="errors.trackingNumber"
          required
          ><UInput name="trackingNumber" required class="w-full"
        /></UFormField>
        <UFormField
          label="Tracking URL"
          name="trackingUrl"
          :error="errors.trackingUrl"
          hint="Optional"
          ><UInput name="trackingUrl" type="url" placeholder="https://" class="w-full"
        /></UFormField>
        <p class="text-xs text-muted">Record this after handing the full order to the carrier.</p>
        <UButton
          type="submit"
          label="Mark as shipped"
          icon="i-lucide-truck"
          :loading="processing"
        />
      </Form>
      <p v-if="order.shipment?.state === 'shipped'" class="text-sm">
        {{ order.shipment.carrier }} · {{ order.shipment.trackingNumber }}
      </p>
      <Form
        v-if="
          order.shipment?.state !== 'shipped' &&
          ['pending_payment', 'confirmed', 'review_required'].includes(order.lifecycleState)
        "
        v-slot="{ processing }"
        route="seller.cancellations.store"
        :params="{ id: order.id }"
        class="mt-4"
      >
        <p class="text-xs text-muted mb-2">
          Cancellation restores held or consumed stock and requests any outstanding full refund.
        </p>
        <UButton
          type="submit"
          label="Cancel order"
          color="error"
          variant="soft"
          :loading="processing"
        />
      </Form>
    </UCard>
    <UCard>
      <template #header><h2 class="font-semibold">Payments and refunds</h2></template>
      <div v-for="payment in order.payments" :key="payment.id" class="space-y-2 mb-5 text-sm">
        <p class="font-medium">{{ money(payment.amountMinor) }} · {{ payment.disposition }}</p>
        <p class="text-muted break-all">{{ payment.provider }} · {{ payment.externalId }}</p>
        <Form
          v-if="
            order.shipment?.state !== 'shipped' &&
            !order.refunds.some(
              (refund) => refund.paymentId === payment.id && refund.state !== 'failed'
            )
          "
          v-slot="{ processing }"
          route="seller.refunds.store"
          :params="{ id: order.id }"
        >
          <input type="hidden" name="paymentId" :value="payment.id" />
          <UButton
            type="submit"
            label="Request full refund"
            variant="soft"
            color="neutral"
            :loading="processing"
          />
        </Form>
      </div>
      <p v-if="!order.payments.length" class="text-sm text-muted">
        No captured payment is recorded.
      </p>
      <div
        v-for="refund in order.refunds"
        :key="refund.id"
        class="border-t border-default pt-3 mt-3"
      >
        <p class="text-sm">Refund {{ money(refund.amountMinor) }} · {{ refund.state }}</p>
        <p v-if="refund.lastError" class="text-xs text-error mt-1">{{ refund.lastError }}</p>
        <Form
          v-if="refund.needsReview && !['succeeded', 'failed'].includes(refund.state)"
          v-slot="{ errors, processing }"
          route="seller.operations.store"
          :params="{ id: order.id }"
          class="mt-3 space-y-3"
        >
          <input type="hidden" name="kind" value="refund" /><input
            type="hidden"
            name="operationId"
            :value="refund.id"
          />
          <UFormField label="Verified refund reference" hint="Optional" :error="errors.externalId"
            ><UInput name="externalId" class="w-full"
          /></UFormField>
          <UButton type="submit" label="Reconcile refund" variant="soft" :loading="processing" />
        </Form>
      </div>
    </UCard>
    <UCard v-if="order.attempt?.needsReview && order.attempt.state !== 'paid'">
      <template #header><h2 class="font-semibold">Recover payment checkout</h2></template>
      <p class="text-sm text-muted mb-3">
        {{ order.attempt.provider }} · {{ order.attempt.lastError }}
      </p>
      <Form
        v-slot="{ errors, processing }"
        route="seller.operations.store"
        :params="{ id: order.id }"
        class="space-y-3"
      >
        <input type="hidden" name="kind" value="payment" /><input
          type="hidden"
          name="operationId"
          :value="order.attempt.id"
        />
        <UFormField
          label="Checkout reference from the provider"
          hint="Optional"
          :error="errors.externalId"
        >
          <UInput name="externalId" class="w-full" />
        </UFormField>
        <p class="text-xs text-muted">
          The reference is checked against this order. Uncertain requests past their replay window
          need the original reference.
        </p>
        <UButton type="submit" label="Reconcile payment" variant="soft" :loading="processing" />
      </Form>
    </UCard>
    <UCard v-if="order.notifications.length">
      <template #header><h2 class="font-semibold">Customer notifications</h2></template>
      <div
        v-for="notification in order.notifications"
        :key="notification.id"
        class="flex items-center justify-between gap-3 py-2 text-sm"
      >
        <p>{{ notification.kind }} · {{ notification.state }}</p>
        <Form
          v-if="notification.state === 'failed'"
          v-slot="{ processing }"
          route="seller.operations.store"
          :params="{ id: order.id }"
        >
          <input type="hidden" name="kind" value="notification" /><input
            type="hidden"
            name="operationId"
            :value="notification.id"
          />
          <UButton type="submit" label="Retry" size="xs" variant="soft" :loading="processing" />
        </Form>
      </div>
    </UCard>
    <UCard v-if="order.activities.length">
      <template #header><h2 class="font-semibold">Order activity</h2></template>
      <ul class="space-y-4 text-sm">
        <li v-for="activity in order.activities" :key="activity.id">
          <p class="capitalize">{{ activity.event.replaceAll('.', ' ').replaceAll('_', ' ') }}</p>
          <p class="text-xs text-muted">
            {{ activity.createdAt ? new Date(activity.createdAt).toLocaleString() : ''
            }}<span v-if="activity.actorId"> · Staff #{{ activity.actorId }}</span>
          </p>
        </li>
      </ul>
    </UCard>
  </div>
</template>

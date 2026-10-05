<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Form } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import { useOrderInteraction } from './interaction'
import { orderLabel, orderMoney, orderDate, operationMessage } from './presentation'

const props = defineProps<{ order: Data.Seller.Order; operations: Data.Seller.OrderOperations }>()
const { locked, callbacks, requestOptions } = useOrderInteraction()
const label = orderLabel
const money = (amount: number, currency = props.order.currencyCode) =>
  orderMoney(amount / 100, currency)
const refundConfirmed = ref<Record<number, boolean>>({})
const cancelConfirmed = ref(false)
const showAllActivity = ref(false)
const visibleActivity = computed(() =>
  showAllActivity.value ? props.order.activities : props.order.activities.slice(0, 8)
)
const refundAction = (paymentId: number) =>
  props.operations.payments.find((payment) => payment.paymentId === paymentId)
watch(
  () => props.operations,
  () => {
    refundConfirmed.value = {}
    cancelConfirmed.value = false
  }
)
const trackingUrl = computed(() => {
  try {
    const url = new URL(props.order.shipment?.trackingUrl || '')
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
})
const closed = computed(() => ['cancelled', 'expired'].includes(props.order.lifecycleState))
const shipped = computed(() => props.order.shipment?.state === 'shipped')
const blockers = computed(() => props.operations.blockers)
const canPack = computed(() => props.operations.canPack)
const canShip = computed(() => props.operations.canShip)
const canCancel = computed(() => props.operations.canCancel)
const nextAction = computed(() => {
  if (closed.value)
    return {
      title: 'Order ' + props.order.lifecycleState,
      description:
        'Fulfillment is closed. Outstanding refunds and customer updates remain visible below.',
      icon: 'i-lucide-circle-slash',
    }
  if (shipped.value)
    return {
      title: 'Shipment recorded',
      description:
        'Tracking details are saved. Check customer updates for delivery of the shipment notification.',
      icon: 'i-lucide-truck',
    }
  if (props.operations.cancellationPending)
    return {
      title: 'Cancellation requested',
      description:
        'The checkout is being closed. Stock remains held until the provider confirms it is unpaid and closed.',
      icon: 'i-lucide-clock',
    }
  if (props.order.lifecycleState === 'pending_payment' && !props.order.attempt?.needsReview)
    return {
      title: 'Waiting for payment confirmation',
      description:
        'A checkout request is not payment confirmation. Refresh status to check for a verified payment.',
      icon: 'i-lucide-clock',
    }
  if (blockers.value.length)
    return {
      title: 'Resolve the dispatch blockers',
      description: 'Review the payment and refund records below before continuing fulfillment.',
      icon: 'i-lucide-shield-alert',
    }
  if (canShip.value)
    return {
      title: 'Ready to dispatch',
      description:
        'Add carrier and tracking details to record the shipment and queue the customer update.',
      icon: 'i-lucide-truck',
    }
  if (canPack.value)
    return {
      title: 'Ready to pack',
      description:
        'Payment is recorded. Start packing, then add tracking details when the parcel is ready to dispatch.',
      icon: 'i-lucide-package',
    }
  return {
    title: 'Fulfillment is not ready',
    description:
      'Payment or shipment prerequisites are incomplete. Review the records below; the server validates payment and stock before each action.',
    icon: 'i-lucide-circle-pause',
  }
})
const stages = computed(() => [
  {
    title: 'Payment',
    icon: 'i-lucide-credit-card',
    text: label(props.order.financialStatus),
    done: props.order.financialStatus === 'paid',
    attention:
      !!props.order.attempt?.needsReview || props.order.lifecycleState === 'review_required',
  },
  {
    title: 'Packing',
    icon: 'i-lucide-package',
    text: shipped.value
      ? 'Complete'
      : props.order.shipment?.state === 'packing'
        ? 'In progress'
        : closed.value
          ? 'Closed'
          : canPack.value
            ? 'Ready to start'
            : 'Not started',
    done: shipped.value,
    attention: false,
  },
  {
    title: 'Dispatch',
    icon: 'i-lucide-truck',
    text: shipped.value
      ? 'Shipped'
      : closed.value
        ? 'Closed'
        : props.order.lifecycleState === 'pending_payment'
          ? 'Waiting for payment'
          : blockers.value.length
            ? 'Blocked'
            : 'Not dispatched',
    done: shipped.value,
    attention:
      !shipped.value &&
      !closed.value &&
      props.order.lifecycleState !== 'pending_payment' &&
      !!blockers.value.length,
  },
  {
    title: 'Customer updates',
    icon: 'i-lucide-mail',
    text: props.order.notifications.some((n) => n.state === 'failed')
      ? 'Delivery failed'
      : props.order.notifications.some((n) => n.state === 'pending')
        ? 'Queued'
        : props.order.notifications.length &&
            props.order.notifications.every((n) => n.state === 'sent')
          ? 'Sent'
          : 'No updates yet',
    done:
      !!props.order.notifications.length &&
      props.order.notifications.every((n) => n.state === 'sent'),
    attention: props.order.notifications.some((n) => n.state === 'failed'),
  },
])
const activityNames: Record<string, string> = {
  'order.created': 'Order placed',
  'order.submitted': 'Order placed',
  'order.confirmed': 'Order confirmed',
  'order.cancelled': 'Order cancelled',
  'shipment.packing': 'Packing started',
  'shipment.shipped': 'Shipment recorded',
  'notification.retry_requested': 'Customer update retry requested',
  'payment.accepted': 'Payment confirmed',
  'refund.requested': 'Refund requested',
  'refund.succeeded': 'Refund confirmed',
  'refund.failed': 'Refund failed',
  'order.cancellation_requested': 'Cancellation requested',
}
</script>

<template>
  <div class="space-y-8">
    <ol
      aria-label="Order workflow"
      class="grid grid-cols-2 gap-x-6 gap-y-5 border-y border-default py-5 lg:grid-cols-4"
    >
      <li v-for="stage in stages" :key="stage.title" class="flex items-start gap-3 min-w-0">
        <UIcon
          :name="stage.done ? 'i-lucide-circle-check' : stage.icon"
          class="size-5 shrink-0 mt-0.5"
          :class="stage.attention ? 'text-default' : stage.done ? 'text-success' : 'text-muted'"
        />
        <div class="min-w-0">
          <p class="text-sm font-semibold text-highlighted">{{ stage.title }}</p>
          <p class="text-sm mt-1" :class="stage.attention ? 'text-default' : 'text-muted'">
            {{ stage.text }}
          </p>
        </div>
      </li>
    </ol>
    <div class="grid gap-8 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <div class="min-w-0 space-y-8">
        <section aria-labelledby="order-next-action" class="rounded-lg bg-elevated/50 p-5 sm:p-6">
          <div class="flex items-start gap-3">
            <UIcon
              :name="nextAction.icon"
              class="size-6 shrink-0 mt-0.5"
              :class="blockers.length ? 'text-default' : 'text-primary'"
            />
            <div class="min-w-0">
              <h2
                id="order-next-action"
                class="text-xl font-semibold text-highlighted"
                aria-live="polite"
              >
                {{ nextAction.title }}
              </h2>
              <p class="text-sm text-muted mt-2 max-w-prose">{{ nextAction.description }}</p>
            </div>
          </div>
          <ul
            v-if="
              blockers.length &&
              !shipped &&
              !closed &&
              (order.lifecycleState !== 'pending_payment' || order.attempt?.needsReview)
            "
            class="mt-5 space-y-2 text-sm text-default"
          >
            <li v-for="reason in blockers" :key="reason" class="flex gap-2">
              <UIcon
                name="i-lucide-circle-alert"
                class="size-4 shrink-0 mt-0.5 text-warning"
              /><span class="[overflow-wrap:anywhere]">{{ reason }}</span>
            </li>
          </ul>
          <a
            v-if="
              blockers.length &&
              !shipped &&
              !closed &&
              (order.lifecycleState !== 'pending_payment' || order.attempt?.needsReview)
            "
            href="#order-payments"
            class="inline-flex mt-4 text-sm font-medium text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
            >Review payment &amp; refunds</a
          >
          <Form
            v-if="canPack"
            v-slot="{ processing }"
            v-bind="callbacks"
            :options="requestOptions"
            disable-while-processing
            route="seller.packing.store"
            :params="{ id: order.id }"
            class="mt-5"
            ><UButton
              type="submit"
              label="Start packing"
              icon="i-lucide-package"
              :loading="processing"
              :disabled="processing || locked"
          /></Form>
          <Form
            v-if="canShip"
            v-slot="{ errors, processing }"
            v-bind="callbacks"
            :options="requestOptions"
            disable-while-processing
            route="seller.shipments.store"
            :params="{ id: order.id }"
            class="mt-6 space-y-4"
          >
            <div class="grid sm:grid-cols-2 gap-4">
              <UFormField label="Carrier" name="carrier" :error="errors.carrier" required
                ><UInput
                  name="carrier"
                  required
                  minlength="2"
                  maxlength="100"
                  autocomplete="off"
                  class="w-full" /></UFormField
              ><UFormField
                label="Tracking number"
                name="trackingNumber"
                :error="errors.trackingNumber"
                required
                ><UInput
                  name="trackingNumber"
                  required
                  minlength="2"
                  maxlength="255"
                  autocomplete="off"
                  class="w-full"
              /></UFormField>
            </div>
            <UFormField
              label="Tracking URL"
              name="trackingUrl"
              :error="errors.trackingUrl"
              hint="Optional"
              ><UInput
                name="trackingUrl"
                type="url"
                maxlength="2048"
                placeholder="https://"
                class="w-full"
            /></UFormField>
            <UButton
              type="submit"
              label="Mark as shipped"
              icon="i-lucide-truck"
              :loading="processing"
              :disabled="processing || locked"
            />
          </Form>
          <dl v-if="shipped" class="mt-5 grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <dt class="text-muted">Carrier</dt>
              <dd class="mt-1 font-medium text-highlighted break-words">
                {{ order.shipment?.carrier || 'Not provided' }}
              </dd>
            </div>
            <div>
              <dt class="text-muted">Tracking number</dt>
              <dd class="mt-1 font-medium text-highlighted break-all">
                {{ order.shipment?.trackingNumber || 'Not provided' }}
              </dd>
            </div>
          </dl>
          <UButton
            v-if="shipped && trackingUrl"
            :href="trackingUrl"
            target="_blank"
            rel="noopener noreferrer"
            label="Track shipment"
            icon="i-lucide-external-link"
            variant="outline"
            color="neutral"
            class="mt-4"
          />
        </section>
        <section id="order-payments" aria-labelledby="order-payments-title" class="scroll-mt-6">
          <div class="flex items-center justify-between gap-3 mb-4">
            <h2 id="order-payments-title" class="text-lg font-semibold text-highlighted">
              Payments &amp; refunds
            </h2>
            <UBadge
              class="text-default"
              :label="label(order.financialStatus)"
              color="neutral"
              variant="subtle"
            />
          </div>
          <div v-if="order.attempt" class="border-b border-default pb-5 mb-5">
            <div class="flex flex-wrap justify-between gap-2 text-sm">
              <p class="font-medium text-highlighted">Payment checkout</p>
              <span class="text-muted"
                >{{ label(order.attempt.state) }} · {{ label(order.attempt.provider) }}</span
              >
            </div>
            <Form
              v-if="order.attempt.needsReview && order.attempt.state !== 'paid'"
              v-slot="{ errors, processing }"
              v-bind="callbacks"
              :options="requestOptions"
              disable-while-processing
              route="seller.operations.store"
              :params="{ id: order.id }"
              class="mt-4 space-y-3"
            >
              <input type="hidden" name="kind" value="payment" /><input
                type="hidden"
                name="operationId"
                :value="order.attempt.id"
              />
              <p v-if="order.attempt.lastError" class="text-sm text-default break-words">
                {{ operationMessage(order.attempt.lastError, 'payment') }}
              </p>
              <UFormField
                label="Checkout reference from the provider"
                name="externalId"
                hint="Optional"
                :error="errors.externalId"
                ><UInput name="externalId" maxlength="255" autocomplete="off" class="w-full"
              /></UFormField>
              <p class="text-sm text-muted">
                Use the original provider reference if the request outcome is uncertain.
                Reconciliation verifies this order’s checkout; it does not manually mark the order
                paid.
              </p>
              <UButton
                type="submit"
                label="Reconcile payment"
                icon="i-lucide-refresh-cw"
                :loading="processing"
                :disabled="processing || locked"
              />
            </Form>
            <p v-else-if="order.attempt.needsReview" class="text-sm text-default mt-3">
              A payment is recorded, but this checkout still needs review. Verify the original
              provider record before continuing.
            </p>
            <p v-if="order.attempt.externalId" class="text-sm text-muted break-all mt-3">
              Checkout reference: {{ order.attempt.externalId }}
            </p>
          </div>
          <p v-if="!order.payments.length" class="text-sm text-muted py-2">
            No captured payment is recorded. A checkout request is not payment confirmation.
          </p>
          <div
            v-for="payment in order.payments"
            :key="payment.id"
            class="py-4 border-b border-default last:border-b-0"
          >
            <div class="flex flex-wrap justify-between items-center gap-2">
              <p class="text-base font-semibold tabular-nums text-highlighted">
                {{ money(payment.amountMinor, payment.currency) }}
              </p>
              <UBadge
                class="text-default"
                :label="label(payment.disposition)"
                :color="payment.disposition === 'accepted' ? 'success' : 'warning'"
                variant="subtle"
              />
            </div>
            <p class="text-sm text-muted break-all mt-2">
              {{ label(payment.provider) }} · {{ payment.externalId }}
            </p>
            <Form
              v-if="refundAction(payment.id)?.canRefund"
              v-slot="{ processing }"
              v-bind="callbacks"
              :options="requestOptions"
              disable-while-processing
              route="seller.refunds.store"
              :params="{ id: order.id }"
              class="mt-3"
            >
              <input type="hidden" name="paymentId" :value="payment.id" />
              <details>
                <summary
                  class="cursor-pointer text-sm font-medium text-default w-fit focus-visible:outline-2 focus-visible:outline-primary"
                >
                  Refund this payment
                </summary>
                <p class="text-sm text-muted mt-3 mb-3">
                  Requests a refund of the remaining
                  {{
                    money(refundAction(payment.id)?.refundableAmountMinor || 0, payment.currency)
                  }}. Confirmation is asynchronous. This blocks dispatch and does not restore stock;
                  cancelling the order restores stock.
                </p>
                <UCheckbox
                  v-model="refundConfirmed[payment.id]"
                  label="I confirm the refund amount above."
                  class="mb-4"
                  :disabled="locked"
                />
                <UButton
                  type="submit"
                  label="Request full refund"
                  icon="i-lucide-undo-2"
                  color="neutral"
                  variant="outline"
                  :loading="processing"
                  :disabled="processing || locked || !refundConfirmed[payment.id]"
                />
              </details>
            </Form>
            <p v-else-if="refundAction(payment.id)?.refundBlocker" class="text-sm text-muted mt-3">
              {{ refundAction(payment.id)?.refundBlocker }}
            </p>
          </div>
          <div
            v-for="refund in order.refunds"
            :key="refund.id"
            class="border-t border-default py-4"
          >
            <div class="flex flex-wrap justify-between gap-2 text-sm">
              <p class="font-medium text-highlighted">
                Refund ·
                {{
                  money(
                    refund.amountMinor,
                    order.payments.find((payment) => payment.id === refund.paymentId)?.currency
                  )
                }}
              </p>
              <UBadge
                class="text-default"
                :label="label(refund.state)"
                :color="
                  refund.state === 'succeeded'
                    ? 'success'
                    : refund.needsReview || refund.state === 'failed'
                      ? 'warning'
                      : 'neutral'
                "
                variant="subtle"
              />
            </div>
            <p v-if="refund.externalId" class="text-sm text-muted break-all mt-2">
              Refund reference: {{ refund.externalId }}
            </p>
            <p v-if="refund.lastError" class="text-sm text-default mt-2 break-words">
              {{ operationMessage(refund.lastError, 'refund') }}
            </p>
            <Form
              v-if="refund.needsReview && !['succeeded', 'failed'].includes(refund.state)"
              v-slot="{ errors, processing }"
              v-bind="callbacks"
              :options="requestOptions"
              disable-while-processing
              route="seller.operations.store"
              :params="{ id: order.id }"
              class="mt-4 space-y-3"
              ><input type="hidden" name="kind" value="refund" /><input
                type="hidden"
                name="operationId"
                :value="refund.id" /><UFormField
                label="Verified refund reference"
                name="externalId"
                hint="Optional"
                :error="errors.externalId"
                ><UInput
                  name="externalId"
                  maxlength="255"
                  autocomplete="off"
                  class="w-full" /></UFormField
              ><UButton
                type="submit"
                label="Reconcile refund"
                icon="i-lucide-refresh-cw"
                variant="soft"
                :loading="processing"
                :disabled="processing || locked"
            /></Form>
          </div>
          <div
            v-for="refund in operations.observedRefunds"
            :key="`observed-${refund.id}`"
            class="border-t border-default py-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-sm font-medium text-highlighted">
                Provider refund · {{ orderMoney(refund.amountMinor / 100, refund.currency) }}
              </p>
              <UBadge
                :label="label(refund.state)"
                :color="refund.state === 'succeeded' ? 'success' : 'warning'"
                variant="subtle"
              />
            </div>
            <p class="text-sm text-muted mt-2">Recorded directly from the payment provider.</p>
            <p class="text-sm text-muted break-all mt-2">
              Refund reference: {{ refund.externalId }}
            </p>
          </div>
        </section>
        <section
          v-if="canCancel || operations.cancelBlocker || operations.cancellationPending"
          aria-label="Order cancellation"
          class="border-t border-default pt-5"
        >
          <p v-if="operations.cancelBlocker" class="text-sm text-muted">
            {{ operations.cancelBlocker }}
          </p>
          <p v-else-if="operations.cancellationPending" class="text-sm text-muted">
            Cancellation is already requested. Refresh status to check the confirmed outcome.
          </p>
          <details v-else>
            <summary
              class="cursor-pointer text-sm font-medium text-error w-fit focus-visible:outline-2 focus-visible:outline-error"
            >
              Cancel this order
            </summary>
            <p class="text-sm text-muted mt-3 mb-4 max-w-prose">
              Cancellation closes the unpaid checkout or restores held/consumed stock and requests
              any outstanding full refund. Uncertain payment outcomes must be resolved first;
              refunds remain pending until confirmed.
            </p>
            <UCheckbox
              v-model="cancelConfirmed"
              label="I confirm cancellation of this order and any required refund."
              :disabled="locked"
              class="mb-4"
            />
            <Form
              v-slot="{ processing }"
              v-bind="callbacks"
              :options="requestOptions"
              disable-while-processing
              route="seller.cancellations.store"
              :params="{ id: order.id }"
              ><UButton
                type="submit"
                label="Cancel order"
                color="error"
                variant="soft"
                :loading="processing"
                :disabled="processing || locked || !cancelConfirmed"
            /></Form>
          </details>
        </section>
      </div>
      <div class="min-w-0 space-y-8 xl:border-l xl:border-default xl:pl-8">
        <section aria-labelledby="order-updates-title">
          <h2 id="order-updates-title" class="text-lg font-semibold text-highlighted">
            Customer updates
          </h2>
          <p class="text-sm text-muted mt-2">
            Receipt and shipment emails. Delivery failures do not reverse payment or fulfillment.
          </p>
          <p v-if="!order.notifications.length" class="text-sm text-muted mt-4">
            No updates have been queued yet.
          </p>
          <ul v-else class="mt-4 divide-y divide-default">
            <li
              v-for="notification in order.notifications"
              :key="notification.id"
              class="py-4 first:pt-0"
            >
              <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
                <p class="font-medium text-highlighted">{{ label(notification.kind) }}</p>
                <UBadge
                  class="text-default"
                  :label="label(notification.state)"
                  :color="
                    notification.state === 'failed'
                      ? 'warning'
                      : notification.state === 'sent'
                        ? 'success'
                        : 'neutral'
                  "
                  variant="subtle"
                />
              </div>
              <p v-if="notification.lastError" class="text-sm text-default mt-2 break-words">
                {{ operationMessage(notification.lastError, 'notification') }}
              </p>
              <Form
                v-if="notification.state === 'failed'"
                v-slot="{ processing }"
                v-bind="callbacks"
                :options="requestOptions"
                disable-while-processing
                route="seller.operations.store"
                :params="{ id: order.id }"
                class="mt-3"
                ><input type="hidden" name="kind" value="notification" /><input
                  type="hidden"
                  name="operationId"
                  :value="notification.id" /><UButton
                  type="submit"
                  :label="'Retry ' + label(notification.kind).toLowerCase()"
                  icon="i-lucide-refresh-cw"
                  variant="outline"
                  color="neutral"
                  :loading="processing"
                  :disabled="processing || locked"
              /></Form>
            </li>
          </ul>
        </section>
        <section aria-labelledby="order-activity-title">
          <h2 id="order-activity-title" class="text-lg font-semibold text-highlighted">
            Order activity
          </h2>
          <p class="text-sm text-muted mt-2">Latest events first.</p>
          <p v-if="!order.activities.length" class="text-sm text-muted mt-4">
            No workflow events have been recorded yet.
          </p>
          <ol v-else class="mt-5 space-y-5">
            <li
              v-for="activity in visibleActivity"
              :key="activity.id"
              class="relative border-l border-default pl-5 pb-1"
            >
              <span
                class="absolute -left-1 top-1.5 size-2 rounded-full bg-accented"
                aria-hidden="true"
              />
              <p class="text-sm font-medium text-highlighted">
                {{ activityNames[activity.event] || label(activity.event) }}
              </p>
              <p class="text-sm text-muted mt-1">
                {{ orderDate(activity.createdAt)
                }}<span v-if="activity.actorId"> · Staff #{{ activity.actorId }}</span>
              </p>
              <details v-if="activity.details && Object.keys(activity.details).length" class="mt-2">
                <summary
                  class="text-sm text-muted cursor-pointer w-fit focus-visible:outline-2 focus-visible:outline-primary"
                >
                  Event details
                </summary>
                <dl class="mt-2 space-y-1 text-sm">
                  <div
                    v-for="(value, key) in activity.details"
                    :key="key"
                    class="[overflow-wrap:anywhere]"
                  >
                    <dt class="inline text-muted">{{ label(String(key)) }}:</dt>
                    <dd class="inline">
                      {{ typeof value === 'object' ? JSON.stringify(value) : value }}
                    </dd>
                  </div>
                </dl>
              </details>
            </li>
          </ol>
          <UButton
            v-if="order.activities.length > 8"
            :label="
              showAllActivity ? 'Show fewer events' : `Show all ${order.activities.length} events`
            "
            color="neutral"
            variant="outline"
            class="mt-4"
            :aria-expanded="showAllActivity"
            @click="showAllActivity = !showAllActivity"
          />
        </section>
      </div>
    </div>
  </div>
</template>

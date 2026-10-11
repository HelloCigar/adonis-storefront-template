<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { Form, Link } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import { useOrderInteraction } from './interaction'
import { orderLabel, orderMoney, orderDate, operationMessage } from './presentation'
import { statusColor, statusLabel } from '~/utils/status'
import PickList from './PickList.vue'
import ShippingAddress from './ShippingAddress.vue'
import CancellationSection from './CancellationSection.vue'
import ReconcileCheckoutForm from './ReconcileCheckoutForm.vue'

type Issue = Data.Seller.OrderOperations['issues'][number]

const props = defineProps<{ order: Data.Seller.Order; operations: Data.Seller.OrderOperations }>()
const { locked, callbacks, requestOptions, announce } = useOrderInteraction()
const label = orderLabel
const money = (amount: number, currency = props.order.currencyCode) =>
  orderMoney(amount / 100, currency)
const refundConfirmed = ref<Record<number, boolean>>({})
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
/** Shipped stays true once the parcel is delivered; delivery only adds to it. */
const shipped = computed(() => ['shipped', 'delivered'].includes(props.order.shipment?.state ?? ''))
const delivered = computed(() => props.order.shipment?.state === 'delivered')
const canPack = computed(() => props.operations.canPack)
const canShip = computed(() => props.operations.canShip)
const canDeliver = computed(() => props.operations.canDeliver)
const paymentReview = computed(
  () => !!props.order.attempt?.needsReview || props.order.lifecycleState === 'review_required'
)
const waitingForPayment = computed(
  () => props.order.lifecycleState === 'pending_payment' && !props.order.attempt?.needsReview
)
/** Issues block fulfillment only while it is still open; an unpaid checkout waits instead. */
const issues = computed<Issue[]>(() =>
  shipped.value || closed.value || waitingForPayment.value ? [] : props.operations.issues
)
const primaryIssue = computed(() => issues.value[0] ?? null)
const otherIssues = computed(() => issues.value.slice(1))
/** True only when the card leads with an issue; other states keep their own body copy. */
const blocked = computed(() => nextAction.value.key.startsWith('blocked'))
const cardReconciles = computed(
  () => blocked.value && primaryIssue.value?.fix === 'reconcile_checkout'
)
const reconcilable = computed(
  () => !!props.order.attempt?.needsReview && props.order.attempt.state !== 'paid'
)
const shippingAddress = computed(
  () =>
    props.order.addresses?.find((address) => address.type === 'shipping') ??
    props.order.addresses?.[0] ??
    null
)
const lineItems = computed(() => props.order.lineItems ?? [])
const emailed = (kind: string) =>
  !!props.order.email &&
  props.order.notifications.some((notification) => notification.kind === kind)
const shipmentEmail = computed(() => emailed('shipment'))
const deliveryEmail = computed(() => emailed('delivery'))

const nextAction = computed(() => {
  if (closed.value)
    return {
      key: 'closed',
      title: `Order ${statusLabel('order', props.order.lifecycleState).toLowerCase()}`,
      description:
        'Fulfillment is closed. Outstanding refunds and customer updates stay visible below.',
      icon: 'i-lucide-circle-slash',
    }
  if (delivered.value)
    return {
      key: 'delivered',
      title: 'Order delivered',
      description: deliveryEmail.value
        ? `Delivery was recorded on ${orderDate(props.order.shipment?.deliveredAt)}. Check customer updates for the delivery email.`
        : `Delivery was recorded on ${orderDate(props.order.shipment?.deliveredAt)}. No delivery email is recorded for this order.`,
      icon: 'i-lucide-package-check',
    }
  if (shipped.value)
    return {
      key: 'shipped',
      title: 'Shipment recorded',
      description: `${
        shipmentEmail.value
          ? 'Tracking is saved. Check customer updates for the shipment email.'
          : 'Tracking is saved. No shipment email is recorded for this order.'
      } Mark the order as delivered once the carrier confirms delivery.`,
      icon: 'i-lucide-truck',
    }
  if (props.operations.cancellationPending)
    return {
      key: 'cancelling',
      title: 'Cancellation requested',
      description:
        'The checkout is being closed. Stock stays held until the provider confirms it is unpaid and closed.',
      icon: 'i-lucide-clock',
    }
  if (waitingForPayment.value)
    return {
      key: 'waiting',
      title: 'Waiting for payment confirmation',
      description:
        'A checkout request is not payment confirmation. Refresh status to check for a verified payment.',
      icon: 'i-lucide-clock',
    }
  if (primaryIssue.value)
    return {
      key: `blocked:${primaryIssue.value.cause}`,
      title: primaryIssue.value.title,
      description: primaryIssue.value.detail,
      icon: 'i-lucide-shield-alert',
    }
  if (canShip.value)
    return {
      key: 'ship',
      title: 'Ready to dispatch',
      description: 'Label the parcel for the address below, then record its tracking.',
      icon: 'i-lucide-truck',
    }
  if (canPack.value)
    return {
      key: 'pack',
      title: 'Ready to pack',
      description: 'Payment is verified. Pick these items, then start packing.',
      icon: 'i-lucide-package',
    }
  return {
    key: 'idle',
    title: 'No fulfillment action is available',
    description: 'Refresh status to load the latest order state before continuing.',
    icon: 'i-lucide-circle-pause',
  }
})

/** Stage state: done, current (the next step), attention (blocked), upcoming, or closed. */
const stages = computed(() => {
  const captured =
    ['paid', 'partially_refunded', 'refunded'].includes(props.order.financialStatus) &&
    !paymentReview.value
  const shipmentState = props.order.shipment?.state
  const steps = [
    {
      title: 'Payment',
      icon: 'i-lucide-credit-card',
      done: captured,
      doneText: statusLabel('payment', props.order.financialStatus),
      currentText: 'Awaiting payment',
      blockedText: paymentReview.value ? 'Needs review' : 'Not verified',
    },
    {
      title: 'Packing',
      icon: 'i-lucide-package',
      done: shipmentState === 'packing' || shipped.value,
      doneText: shipped.value ? 'Packed' : 'Started',
      currentText: 'Ready to pack',
      blockedText: 'Blocked',
    },
    {
      title: 'Dispatch',
      icon: 'i-lucide-truck',
      done: shipped.value,
      doneText: 'Shipped',
      currentText: 'Add tracking',
      blockedText: 'Blocked',
    },
    {
      title: 'Delivery',
      icon: 'i-lucide-package-check',
      done: delivered.value,
      doneText: 'Delivered',
      currentText: 'In transit',
      blockedText: 'Blocked',
    },
  ]
  const currentIndex = steps.findIndex((step) => !step.done)
  return steps.map((step, index) => {
    if (step.done) return { ...step, state: 'done', text: step.doneText }
    if (closed.value) return { ...step, state: 'closed', text: 'Closed' }
    if (index !== currentIndex) return { ...step, state: 'upcoming', text: 'Not started' }
    if (primaryIssue.value || (index === 0 && paymentReview.value))
      return { ...step, state: 'attention', text: step.blockedText }
    return { ...step, state: 'current', text: step.currentText }
  })
})

const updateLabels: Record<string, string> = { pending: 'Queued', sent: 'Sent', failed: 'Failed' }
const updatesSummary = computed(() => {
  const notifications = props.order.notifications
  // A single update already shows its own state; summarize only a list.
  if (notifications.length < 2) return null
  const failed = notifications.filter((notification) => notification.state === 'failed').length
  if (failed) return { label: `${failed} failed`, color: 'warning' as const }
  if (notifications.some((notification) => notification.state === 'pending'))
    return { label: 'Queued', color: 'neutral' as const }
  if (notifications.length) return { label: 'All sent', color: 'success' as const }
  return null
})

const heading = useTemplateRef<HTMLElement>('heading')
const transitionMessages: Record<string, string> = {
  pack: 'Ready to pack.',
  ship: 'Packing started. Add the carrier and tracking number to record the shipment.',
  shipped: 'Shipment recorded.',
  delivered: 'Delivery recorded.',
  cancelling: 'Cancellation requested.',
  waiting: 'Waiting for payment confirmation.',
}
// After a state change removes the control that had focus, continue from the new task.
watch(
  () => nextAction.value.key,
  async (key) => {
    announce(
      transitionMessages[key] ??
        (key.startsWith('blocked')
          ? `Fulfillment is blocked. ${nextAction.value.title}.`
          : `${nextAction.value.title}.`)
    )
    await nextTick()
    const active = document.activeElement
    if (active && active !== document.body) return
    const carrier =
      key === 'ship'
        ? document.querySelector<HTMLElement>('#order-ship-form [name="carrier"]')
        : null
    ;(carrier ?? heading.value)?.focus()
  }
)

const activityNames: Record<string, string> = {
  'order.created': 'Order placed',
  'order.submitted': 'Order placed',
  'order.confirmed': 'Order confirmed',
  'order.cancelled': 'Order cancelled',
  'shipment.packing': 'Packing started',
  'shipment.shipped': 'Shipment recorded',
  'shipment.delivered': 'Delivery recorded',
  'notification.retry_requested': 'Customer update retry requested',
  'payment.accepted': 'Payment confirmed',
  'refund.requested': 'Refund requested',
  'refund.succeeded': 'Refund confirmed',
  'refund.failed': 'Refund failed',
  'order.cancellation_requested': 'Cancellation requested',
}
const detailValue = (value: unknown) =>
  value && typeof value === 'object'
    ? Object.entries(value)
        .map(([key, entry]) => `${label(key)} ${entry}`)
        .join(', ')
    : String(value ?? '—')
</script>

<template>
  <div class="space-y-8">
    <ol
      aria-label="Fulfillment progress"
      class="grid grid-cols-2 gap-x-4 gap-y-5 border-y border-default py-5 sm:grid-cols-4"
    >
      <li
        v-for="stage in stages"
        :key="stage.title"
        :aria-current="
          stage.state === 'current' || stage.state === 'attention' ? 'step' : undefined
        "
        class="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3"
      >
        <UIcon
          :name="
            stage.state === 'done'
              ? 'i-lucide-circle-check'
              : stage.state === 'attention'
                ? 'i-lucide-triangle-alert'
                : stage.state === 'closed'
                  ? 'i-lucide-circle-slash'
                  : stage.icon
          "
          class="size-5 shrink-0 sm:mt-0.5"
          :class="{
            'text-success': stage.state === 'done',
            'text-warning': stage.state === 'attention',
            'text-primary': stage.state === 'current',
            'text-muted': stage.state === 'upcoming' || stage.state === 'closed',
          }"
        />
        <div class="min-w-0">
          <p class="text-sm font-semibold text-highlighted">{{ stage.title }}</p>
          <p
            class="text-sm mt-0.5"
            :class="{
              'text-warning font-medium': stage.state === 'attention',
              'text-primary font-medium': stage.state === 'current',
              'text-muted': ['done', 'upcoming', 'closed'].includes(stage.state),
            }"
          >
            {{ stage.text }}
          </p>
        </div>
      </li>
    </ol>
    <div class="grid gap-8 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <div class="min-w-0 space-y-8">
        <section
          aria-labelledby="order-next-action"
          class="@container rounded-lg bg-elevated/50 p-5 sm:p-6"
        >
          <div class="flex items-start gap-3">
            <UIcon
              :name="nextAction.icon"
              class="size-6 shrink-0 mt-0.5"
              :class="blocked ? 'text-warning' : 'text-primary'"
            />
            <div class="min-w-0">
              <h2
                id="order-next-action"
                ref="heading"
                tabindex="-1"
                class="text-xl font-semibold text-highlighted focus:outline-none"
              >
                {{ nextAction.title }}
              </h2>
              <p class="text-sm text-default mt-2 max-w-prose">{{ nextAction.description }}</p>
              <p
                v-if="blocked && primaryIssue?.note"
                class="text-sm text-default mt-2 max-w-prose [overflow-wrap:anywhere]"
              >
                <span class="font-medium text-highlighted">Review reason:</span>
                {{ primaryIssue.note }}
              </p>
            </div>
          </div>

          <template v-if="blocked && primaryIssue">
            <ReconcileCheckoutForm
              v-if="primaryIssue.fix === 'reconcile_checkout' && order.attempt"
              :order="order"
              :attempt="order.attempt"
              class="mt-5"
            />
            <a
              v-else-if="
                primaryIssue.fix === 'review_payment' || primaryIssue.fix === 'review_refunds'
              "
              href="#order-payments"
              class="inline-flex mt-4 text-sm font-medium text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
              >{{
                primaryIssue.fix === 'review_refunds'
                  ? 'Go to refund records'
                  : 'Go to payment records'
              }}</a
            >
            <ul
              v-else-if="primaryIssue.fix === 'check_stock' && primaryIssue.products.length"
              class="mt-4 space-y-1.5"
            >
              <li v-for="product in primaryIssue.products" :key="product.id">
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
                <li v-for="issue in otherIssues" :key="issue.cause" class="flex gap-2.5">
                  <UIcon
                    name="i-lucide-triangle-alert"
                    class="size-4 shrink-0 mt-0.5 text-warning"
                    aria-hidden="true"
                  />
                  <div class="min-w-0 text-sm">
                    <p class="font-medium text-highlighted">{{ issue.title }}</p>
                    <p class="text-default mt-0.5 max-w-prose">{{ issue.detail }}</p>
                    <a
                      v-if="issue.fix === 'review_payment' || issue.fix === 'review_refunds'"
                      href="#order-payments"
                      class="inline-flex mt-1.5 font-medium text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
                      >{{
                        issue.fix === 'review_refunds'
                          ? 'Go to refund records'
                          : 'Go to payment records'
                      }}</a
                    >
                    <template v-else-if="issue.fix === 'check_stock'">
                      <Link
                        v-for="product in issue.products"
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
          </template>

          <template v-else-if="canPack">
            <PickList :items="lineItems" heading-id="order-pick-list" class="mt-5" />
            <Form
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
          </template>

          <div
            v-else-if="canShip"
            class="mt-6 grid gap-6 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]"
          >
            <div class="min-w-0 space-y-5">
              <ShippingAddress :address="shippingAddress" heading-id="order-ship-to" />
              <details>
                <summary
                  class="cursor-pointer text-sm font-medium text-default w-fit focus-visible:outline-2 focus-visible:outline-primary"
                >
                  Parcel contents
                </summary>
                <PickList :items="lineItems" :title="null" class="mt-3" />
              </details>
            </div>
            <div id="order-ship-form" class="@container min-w-0">
              <Form
                v-slot="{ errors, processing }"
                v-bind="callbacks"
                :options="requestOptions"
                disable-while-processing
                route="seller.shipments.store"
                :params="{ id: order.id }"
                class="space-y-4"
              >
                <div class="grid @lg:grid-cols-2 gap-4">
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
                <p class="text-sm text-default [overflow-wrap:anywhere]">
                  <template v-if="order.email"
                    >Saving emails this tracking to <bdi class="font-medium">{{ order.email }}</bdi
                    >.
                  </template>
                  Tracking can’t be changed after it is saved, so check the number first.
                </p>
                <UButton
                  type="submit"
                  label="Mark as shipped"
                  icon="i-lucide-truck"
                  :loading="processing"
                  :disabled="processing || locked"
                />
              </Form>
            </div>
          </div>

          <template v-else-if="shipped">
            <dl class="mt-5 grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt class="text-muted">Shipped</dt>
                <dd class="mt-1 font-medium text-highlighted">
                  {{ orderDate(order.shipment?.shippedAt) }}
                </dd>
              </div>
              <div>
                <dt class="text-muted">Delivered</dt>
                <dd class="mt-1 font-medium text-highlighted">
                  {{ delivered ? orderDate(order.shipment?.deliveredAt) : 'Not yet confirmed' }}
                </dd>
              </div>
              <div>
                <dt class="text-muted">Carrier</dt>
                <dd class="mt-1 font-medium text-highlighted break-words">
                  {{ order.shipment?.carrier || 'Not provided' }}
                </dd>
              </div>
              <div>
                <dt class="text-muted">Tracking number</dt>
                <dd class="mt-1 font-medium text-highlighted break-all tabular-nums">
                  {{ order.shipment?.trackingNumber || 'Not provided' }}
                </dd>
              </div>
            </dl>
            <UButton
              v-if="trackingUrl"
              :href="trackingUrl"
              target="_blank"
              rel="noopener noreferrer"
              label="Track shipment"
              icon="i-lucide-external-link"
              variant="outline"
              color="neutral"
              class="mt-4"
            />
            <Form
              v-if="canDeliver"
              v-slot="{ processing }"
              v-bind="callbacks"
              :options="requestOptions"
              disable-while-processing
              route="seller.deliveries.store"
              :params="{ id: order.id }"
              class="mt-5 border-t border-default pt-5"
            >
              <p class="text-sm text-default max-w-prose [overflow-wrap:anywhere]">
                Confirm delivery only after the carrier reports it.
                <template v-if="order.email"
                  >Saving emails a delivery confirmation to
                  <bdi class="font-medium">{{ order.email }}</bdi
                  >.</template
                >
              </p>
              <UButton
                type="submit"
                label="Mark as delivered"
                icon="i-lucide-package-check"
                class="mt-3"
                :loading="processing"
                :disabled="processing || locked"
              />
            </Form>
          </template>
        </section>

        <section id="order-payments" aria-labelledby="order-payments-title" class="scroll-mt-6">
          <h2 id="order-payments-title" class="text-lg font-semibold text-highlighted mb-4">
            Payments &amp; refunds
          </h2>
          <div v-if="order.attempt" class="border-b border-default pb-5 mb-1">
            <div class="flex flex-wrap justify-between gap-2 text-sm">
              <h3 class="font-medium text-highlighted">Payment checkout</h3>
              <span class="text-muted"
                >{{ statusLabel('checkout', order.attempt.state) }} ·
                {{ label(order.attempt.provider) }}</span
              >
            </div>
            <p v-if="cardReconciles" class="text-sm text-default mt-3">
              This checkout needs a provider recheck. Use the form at the top of the page.
            </p>
            <template v-else-if="reconcilable">
              <p class="text-sm text-default mt-3">
                The provider’s result for this checkout is uncertain. Recheck it before relying on
                this order’s payment status.
              </p>
              <ReconcileCheckoutForm :order="order" :attempt="order.attempt" class="mt-4" />
            </template>
            <p v-else-if="order.attempt.needsReview" class="text-sm text-default mt-3">
              A payment is recorded, but this checkout still needs review. Verify the original
              provider record before continuing.
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
                :label="payment.disposition === 'accepted' ? 'Paid' : label(payment.disposition)"
                :color="payment.disposition === 'accepted' ? 'success' : 'warning'"
                variant="subtle"
              />
            </div>
            <p class="text-sm text-muted break-all mt-2">
              {{ label(payment.provider) }} payment <bdi>{{ payment.externalId }}</bdi>
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
                <p class="text-sm text-default mt-3 mb-3 max-w-prose">
                  Requests a refund of the remaining
                  {{
                    money(refundAction(payment.id)?.refundableAmountMinor || 0, payment.currency)
                  }}. It stays pending until the provider confirms it. A refund blocks dispatch but
                  does not return stock; cancelling the order does.
                </p>
                <UCheckbox
                  v-model="refundConfirmed[payment.id]"
                  :label="`I confirm refunding ${money(refundAction(payment.id)?.refundableAmountMinor || 0, payment.currency)} to this payment.`"
                  class="mb-4"
                  :disabled="locked"
                />
                <UButton
                  type="submit"
                  :label="`Request refund of ${money(refundAction(payment.id)?.refundableAmountMinor || 0, payment.currency)}`"
                  icon="i-lucide-undo-2"
                  color="neutral"
                  variant="outline"
                  :loading="processing"
                  :disabled="processing || locked || !refundConfirmed[payment.id]"
                />
              </details>
            </Form>
            <p
              v-else-if="refundAction(payment.id)?.refundBlocker"
              class="text-sm text-default mt-3"
            >
              {{ refundAction(payment.id)?.refundBlocker }}
            </p>
          </div>
          <div
            v-for="refund in order.refunds"
            :key="refund.id"
            class="border-t border-default py-4"
          >
            <div class="flex flex-wrap justify-between gap-2 text-sm">
              <h3 class="font-medium text-highlighted">
                Refund ·
                {{
                  money(
                    refund.amountMinor,
                    order.payments.find((payment) => payment.id === refund.paymentId)?.currency
                  )
                }}
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
                label="Provider refund reference"
                name="externalId"
                hint="Optional"
                help="Leave blank to recheck the saved refund."
                :error="errors.externalId"
                ><UInput
                  name="externalId"
                  maxlength="255"
                  autocomplete="off"
                  class="w-full" /></UFormField
              ><UButton
                type="submit"
                label="Recheck refund with provider"
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
              <h3 class="text-sm font-medium text-highlighted">
                Provider refund · {{ orderMoney(refund.amountMinor / 100, refund.currency) }}
              </h3>
              <UBadge
                :label="label(refund.state)"
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
        <CancellationSection
          v-if="operations.canCancel || operations.cancelBlocker || operations.cancellationPending"
          :order="order"
          :operations="operations"
        />
      </div>
      <div class="min-w-0 space-y-8 xl:border-l xl:border-default xl:pl-8">
        <section aria-labelledby="order-updates-title">
          <div class="flex items-center justify-between gap-3">
            <h2 id="order-updates-title" class="text-lg font-semibold text-highlighted">
              Customer updates
            </h2>
            <UBadge
              v-if="updatesSummary"
              class="text-default"
              :label="updatesSummary.label"
              :color="updatesSummary.color"
              variant="subtle"
            />
          </div>
          <p class="text-sm text-muted mt-2">
            Receipt, shipment, and delivery emails. Email failures do not reverse payment or
            fulfillment.
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
                <h3 class="font-medium text-highlighted">{{ label(notification.kind) }}</h3>
                <UBadge
                  class="text-default"
                  :label="updateLabels[notification.state] ?? label(notification.state)"
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
                }}<span v-if="activity.actorName || activity.actorId">
                  · <bdi>{{ activity.actorName || 'Staff member' }}</bdi></span
                >
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
                    <dd class="inline">{{ detailValue(value) }}</dd>
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

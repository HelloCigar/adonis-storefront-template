<script setup lang="ts">
import { computed, nextTick, useTemplateRef, watch } from 'vue'
import { formatDistanceToNowStrict, parseISO } from 'date-fns'
import type { Data } from '@generated/data'
import { useOrderInteraction } from './interaction'
import { orderDate } from './presentation'
import { statusLabel } from '~/utils/status'
import StageProgress, { type Stage } from './StageProgress.vue'
import BlockedStep from './BlockedStep.vue'
import PackStep from './PackStep.vue'
import ShipStep from './ShipStep.vue'
import ShippedStep from './ShippedStep.vue'

type Issue = Data.Seller.OrderOperations['issues'][number]

const props = defineProps<{
  order: Data.Seller.Order
  operations: Data.Seller.OrderOperations
  /** From the order queue: when the order started waiting on staff, or null. */
  waitingSince?: string | null
}>()
const { announce } = useOrderInteraction()

const closed = computed(() => ['cancelled', 'expired'].includes(props.order.lifecycleState))
/** Shipped stays true once the parcel is delivered; delivery only adds to it. */
const shipped = computed(() => ['shipped', 'delivered'].includes(props.order.shipment?.state ?? ''))
const delivered = computed(() => props.order.shipment?.state === 'delivered')
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
const emailed = (kind: string) =>
  !!props.order.email &&
  props.order.notifications.some((notification) => notification.kind === kind)

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
      description: emailed('delivery')
        ? `Delivery was recorded on ${orderDate(props.order.shipment?.deliveredAt)}. Check customer updates for the delivery email.`
        : `Delivery was recorded on ${orderDate(props.order.shipment?.deliveredAt)}. No delivery email is recorded for this order.`,
      icon: 'i-lucide-package-check',
    }
  if (shipped.value)
    return {
      key: 'shipped',
      title: props.operations.canDeliver ? 'Confirm delivery' : 'Shipment recorded',
      description: `${
        emailed('shipment')
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
      title: statusLabel('stage', 'awaiting_payment'),
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
  if (props.operations.canShip)
    return {
      key: 'ship',
      title: 'Add tracking',
      description:
        'Label the parcel for this address, then record the carrier and tracking number.',
      icon: 'i-lucide-truck',
    }
  if (props.operations.canPack)
    return {
      key: 'pack',
      title: 'Pack items',
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

const blocked = computed(() => nextAction.value.key.startsWith('blocked'))
/** Whether the area asks staff to do something now, as opposed to reporting a settled state. */
const actionable = computed(
  () =>
    blocked.value ||
    ['pack', 'ship'].includes(nextAction.value.key) ||
    (nextAction.value.key === 'shipped' && props.operations.canDeliver)
)
const waiting = computed(() =>
  actionable.value && props.waitingSince
    ? `Waiting ${formatDistanceToNowStrict(parseISO(props.waitingSince))}`
    : ''
)

const stages = computed<Stage[]>(() => {
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
  return steps.map((step, index): Stage => {
    if (step.done) return { ...step, state: 'done', text: step.doneText }
    if (closed.value) return { ...step, state: 'closed', text: 'Closed' }
    if (index !== currentIndex) return { ...step, state: 'upcoming', text: 'Not started' }
    if (primaryIssue.value || (index === 0 && paymentReview.value))
      return { ...step, state: 'attention', text: step.blockedText }
    return { ...step, state: 'current', text: step.currentText }
  })
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
</script>

<template>
  <section
    aria-labelledby="order-next-action"
    class="@container rounded-lg bg-elevated/50 p-5 sm:p-6"
  >
    <StageProgress :stages="stages" class="mb-5 pb-4 border-b border-default" />
    <div class="flex items-start gap-3">
      <UIcon
        :name="nextAction.icon"
        class="size-6 shrink-0 mt-0.5"
        :class="blocked ? 'text-warning' : 'text-primary'"
      />
      <div class="min-w-0">
        <p class="text-xs font-semibold uppercase tracking-wide text-muted">
          {{ actionable ? 'Next step' : 'Current state'
          }}<span v-if="waiting" class="font-normal normal-case tracking-normal">
            · {{ waiting }}</span
          >
        </p>
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

    <BlockedStep
      v-if="blocked && primaryIssue"
      :order="order"
      :issue="primaryIssue"
      :other-issues="issues.slice(1)"
      class="mt-5"
    />
    <PackStep v-else-if="operations.canPack" :order="order" class="mt-5" />
    <ShipStep v-else-if="operations.canShip" :order="order" class="mt-6" />
    <ShippedStep
      v-else-if="shipped"
      :order="order"
      :can-deliver="operations.canDeliver"
      class="mt-5"
    />
  </section>
</template>

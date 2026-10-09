<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted } from 'vue'
import { Head, usePoll, usePage, router as inertiaRouter } from '@inertiajs/vue3'
import { Form, Link, useRouter } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import OrderChat from '~/components/chat/OrderChat.vue'
import SummaryLines from '~/components/checkout/SummaryLines.vue'
import { urlFor } from '~/client'
const props = defineProps<{
  status: Data.Checkout.Status
  canClaim: boolean
  hasInvoice: boolean
  conversation?: Data.Chat.Conversation | null
}>()
const page = usePage()
const router = useRouter()
const waiting = computed(
  () => props.status.lifecycleState === 'pending_payment' && !props.status.reviewRequired
)
const shipmentState = computed(() => props.status.shipment?.state)
const dispatched = computed(() => ['shipped', 'delivered'].includes(shipmentState.value ?? ''))
const ended = computed(() => ['cancelled', 'expired'].includes(props.status.lifecycleState))
const formatDate = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'long', timeZone: 'Asia/Manila' }).format(
        new Date(value)
      )
    : null
const deliveredOn = computed(() => formatDate(props.status.shipment?.deliveredAt))
const title = computed(() => {
  if (props.status.reviewRequired) return 'We’re checking your payment'
  if (props.status.closing && waiting.value) return 'Cancelling your checkout'
  if (props.status.lifecycleState === 'confirmed')
    return shipmentState.value === 'delivered'
      ? 'Your order was delivered'
      : dispatched.value
        ? 'Your order is on its way'
        : 'Payment received'
  if (props.status.lifecycleState === 'cancelled') return 'Order cancelled'
  if (props.status.lifecycleState === 'expired') return 'Checkout expired'
  return props.status.checkoutUrl ? 'Your order is ready to pay' : 'Preparing your payment'
})
const tones = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  error: 'bg-error/10 text-error',
  neutral: 'bg-elevated text-muted',
}
const badge = computed<{ icon: string; tone: keyof typeof tones; spin?: boolean }>(() => {
  if (props.status.reviewRequired) return { icon: 'i-lucide-shield-alert', tone: 'warning' }
  if (props.status.lifecycleState === 'confirmed') {
    if (shipmentState.value === 'delivered')
      return { icon: 'i-lucide-package-check', tone: 'success' }
    if (dispatched.value) return { icon: 'i-lucide-truck', tone: 'primary' }
    return { icon: 'i-lucide-circle-check', tone: 'success' }
  }
  if (props.status.lifecycleState === 'cancelled')
    return { icon: 'i-lucide-circle-x', tone: 'error' }
  if (props.status.lifecycleState === 'expired')
    return { icon: 'i-lucide-timer-off', tone: 'neutral' }
  if (props.status.checkoutUrl && !props.status.closing)
    return { icon: 'i-lucide-credit-card', tone: 'primary' }
  return { icon: 'i-lucide-loader-circle', tone: 'neutral', spin: true }
})
// Progress is derived only from backend order, payment, and shipment state.
const progress = computed(() => {
  const shipment = props.status.shipment
  const confirmed = props.status.lifecycleState === 'confirmed'
  const step = !confirmed ? 1 : shipmentState.value === 'delivered' ? 4 : dispatched.value ? 3 : 2
  return {
    step,
    items: [
      { title: 'Order placed', icon: 'i-lucide-receipt' },
      {
        title: confirmed
          ? 'Payment received'
          : props.status.reviewRequired
            ? 'Checking your payment'
            : 'Waiting for payment',
        icon: 'i-lucide-credit-card',
      },
      {
        title: dispatched.value ? 'Shipped' : confirmed ? 'Preparing your parcel' : 'Shipping',
        description:
          dispatched.value && shipment
            ? `${shipment.carrier} · ${shipment.trackingNumber}`
            : undefined,
        date: dispatched.value ? (formatDate(shipment?.shippedAt) ?? undefined) : undefined,
        icon: 'i-lucide-package',
      },
      {
        title: 'Delivered',
        date: deliveredOn.value ?? undefined,
        icon: 'i-lucide-house',
      },
    ],
  }
})
const hasMain = computed(() => waiting.value || !ended.value || !!props.conversation)
const money = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount / 100)
const peso = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)
const lines = computed(() =>
  (props.status.order.lineItems ?? []).map((line) => ({
    key: line.id,
    title: line.title,
    detail: line.variantTitle,
    quantity: line.quantity,
    amount: peso(line.totalAmount),
  }))
)
const { start, stop } = usePoll(3000, { only: ['status'] }, { autoStart: false })
watch(waiting, (value) => (value ? start() : stop()), { immediate: true })
// Messaging opens once payment confirms the order.
watch(
  () => props.status.lifecycleState,
  (state, previous) => {
    if (state === 'confirmed' && previous !== 'confirmed')
      inertiaRouter.reload({ only: ['conversation'] })
  }
)
let pollingDeadline: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  pollingDeadline = setTimeout(stop, 10 * 60 * 1000)
  if (waiting.value)
    router.post(
      { route: 'checkout.reconciliations.store', routeParams: { publicId: props.status.publicId } },
      {},
      { preserveScroll: true, preserveState: true }
    )
})
onUnmounted(() => {
  stop()
  if (pollingDeadline) clearTimeout(pollingDeadline)
})
</script>
<template>
  <Head :title="status.order.number" />
  <UContainer class="py-8 lg:py-12" :class="hasMain ? 'max-w-6xl' : 'max-w-2xl'">
    <div class="flex items-start gap-4 mb-8">
      <span
        class="inline-flex size-12 shrink-0 items-center justify-center rounded-full"
        :class="tones[badge.tone]"
        aria-hidden="true"
      >
        <UIcon :name="badge.icon" class="size-6" :class="{ 'animate-spin': badge.spin }" />
      </span>
      <div class="min-w-0">
        <p class="text-sm text-muted mb-1">Order {{ status.order.number }}</p>
        <h1 class="text-3xl font-semibold text-highlighted">{{ title }}</h1>
        <p v-if="status.reviewRequired" class="text-muted mt-2">
          Keep this page and your receipt. Our team will check the payment before dispatching your
          order.
        </p>
        <p v-else-if="shipmentState === 'delivered'" class="text-muted mt-2">
          {{ deliveredOn ? `Delivered on ${deliveredOn}.` : 'Your parcel was delivered.' }}
          Thank you for shopping with us.
        </p>
        <p v-else-if="status.lifecycleState === 'confirmed'" class="text-muted mt-2">
          Your receipt is being sent to {{ status.order.email }}.
        </p>
        <p v-else-if="waiting && !status.closing" class="text-muted mt-2">
          Return here after paying. Payment confirmation may take a moment.
        </p>
        <p v-else-if="status.lifecycleState === 'expired'" class="text-muted mt-2">
          The stock hold has ended. Start a new order to check current availability.
        </p>
      </div>
    </div>

    <div
      class="grid gap-6 items-start"
      :class="
        hasMain
          ? 'lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_24rem]'
          : ''
      "
    >
      <div v-if="hasMain" class="space-y-6">
        <UCard v-if="waiting">
          <template #header>
            <h2 class="font-semibold text-highlighted">
              {{ status.closing ? 'Closing your payment' : 'Complete your payment' }}
            </h2>
            <p v-if="status.expiresAtMs" class="text-sm text-muted mt-1">
              Your items are held until
              {{
                new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(
                  new Date(status.expiresAtMs)
                )
              }}.
            </p>
          </template>
          <div class="flex flex-wrap items-center gap-3">
            <UButton
              v-if="status.checkoutUrl"
              :href="status.checkoutUrl"
              external
              label="Pay now"
              icon="i-lucide-credit-card"
              size="lg"
            />
            <span v-else class="inline-flex items-center gap-2 text-sm text-muted">
              <UIcon name="i-lucide-loader-circle" class="animate-spin size-5" />
              {{ status.closing ? 'Closing the payment page' : 'Opening the payment page' }}
            </span>
            <Form
              v-slot="{ processing }"
              route="checkout.reconciliations.store"
              :params="{ publicId: status.publicId }"
              :options="{ preserveScroll: true }"
            >
              <UButton
                type="submit"
                label="Check payment"
                variant="soft"
                :size="status.checkoutUrl ? 'lg' : 'md'"
                :loading="processing"
              />
            </Form>
            <Form
              v-if="!status.closing"
              v-slot="{ processing }"
              route="checkout.cancellations.store"
              :params="{ publicId: status.publicId }"
              :options="{ preserveScroll: true }"
              class="sm:ms-auto"
            >
              <UButton
                type="submit"
                label="Cancel checkout"
                color="neutral"
                variant="ghost"
                :size="status.checkoutUrl ? 'lg' : 'md'"
                :loading="processing"
              />
            </Form>
          </div>
        </UCard>

        <UCard v-if="!ended">
          <template #header>
            <h2 class="font-semibold text-highlighted">Order progress</h2>
          </template>
          <UTimeline :items="progress.items" :model-value="progress.step" size="sm" />
          <UButton
            v-if="dispatched && status.shipment?.trackingUrl"
            :href="status.shipment.trackingUrl"
            external
            label="Track delivery"
            icon="i-lucide-map-pin"
            variant="soft"
            class="mt-5"
          />
        </UCard>

        <UCard v-if="conversation" :ui="{ body: 'p-0 sm:p-0 flex flex-col h-[28rem]' }">
          <template #header>
            <h2 class="font-semibold text-highlighted">Messages</h2>
            <p class="text-sm text-muted mt-1">Ask the store team anything about this order.</p>
          </template>
          <OrderChat :conversation="conversation" side="customer" />
        </UCard>
      </div>

      <aside class="space-y-6 lg:sticky lg:top-[calc(var(--ui-header-height)+1.5rem)]">
        <UCard>
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h2 class="font-semibold text-highlighted">Order summary</h2>
              <UButton
                v-if="hasInvoice"
                :href="urlFor('checkout.invoices.show', { publicId: status.publicId })"
                external
                label="Invoice"
                icon="i-lucide-file-down"
                color="neutral"
                variant="soft"
                size="sm"
              />
            </div>
          </template>
          <SummaryLines :lines="lines" />
          <dl class="mt-5 pt-5 border-t border-default space-y-3 text-sm tabular-nums">
            <div class="flex justify-between">
              <dt class="text-muted">Subtotal</dt>
              <dd>{{ peso(status.order.subtotalAmount) }}</dd>
            </div>
            <div v-if="status.discountMinor" class="flex justify-between text-success">
              <dt>
                Discount{{ status.order.discountCode ? ` (${status.order.discountCode})` : '' }}
              </dt>
              <dd>−{{ money(status.discountMinor) }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted">Shipping</dt>
              <dd>{{ money(status.shippingMinor) }}</dd>
            </div>
            <div
              class="flex items-baseline justify-between border-t border-default pt-3 text-lg font-semibold text-highlighted"
            >
              <dt>Total</dt>
              <dd>{{ money(status.amountMinor) }}</dd>
            </div>
            <div v-for="refund in status.refunds" :key="refund.id" class="flex justify-between">
              <dt class="text-muted">Refund · {{ refund.state }}</dt>
              <dd>−{{ money(refund.amountMinor) }}</dd>
            </div>
          </dl>
          <div v-if="status.order.shippingAddress" class="mt-5 pt-5 border-t border-default">
            <h3 class="text-sm font-medium text-highlighted mb-2">Delivery address</h3>
            <address class="not-italic text-sm text-muted">
              <p v-for="line in status.order.shippingAddress.formatted" :key="line">
                {{ line }}
              </p>
            </address>
          </div>
        </UCard>
        <div class="flex flex-wrap items-center justify-between gap-4">
          <Form
            v-if="canClaim"
            v-slot="{ processing }"
            route="checkout.access.store"
            :params="{ publicId: status.publicId }"
          >
            <UButton
              type="submit"
              label="Save to my account"
              variant="soft"
              :loading="processing"
            />
          </Form>
          <Link v-else-if="!page.props.user" route="session.create" class="text-sm text-primary"
            >Sign in to save this order</Link
          >
          <Link route="home" class="text-sm text-primary">Continue shopping</Link>
        </div>
      </aside>
    </div>
  </UContainer>
</template>

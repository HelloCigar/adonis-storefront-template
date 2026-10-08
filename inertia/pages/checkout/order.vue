<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted } from 'vue'
import { Head, usePoll, usePage, router as inertiaRouter } from '@inertiajs/vue3'
import { Form, Link, useRouter } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import OrderChat from '~/components/chat/OrderChat.vue'
const props = defineProps<{
  status: Data.Checkout.Status
  canClaim: boolean
  conversation?: Data.Chat.Conversation | null
}>()
const page = usePage()
const router = useRouter()
const waiting = computed(
  () => props.status.lifecycleState === 'pending_payment' && !props.status.reviewRequired
)
const shipmentState = computed(() => props.status.shipment?.state)
const dispatched = computed(() => ['shipped', 'delivered'].includes(shipmentState.value ?? ''))
const deliveredOn = computed(() =>
  props.status.shipment?.deliveredAt
    ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'long', timeZone: 'Asia/Manila' }).format(
        new Date(props.status.shipment.deliveredAt)
      )
    : null
)
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
const money = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount / 100)
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
  <UContainer class="py-8 lg:py-12 max-w-4xl">
    <div class="mb-8">
      <p class="text-sm text-muted mb-2">Order {{ status.order.number }}</p>
      <h1 class="text-3xl font-semibold text-highlighted">{{ title }}</h1>
      <p v-if="status.reviewRequired" class="text-muted mt-3">
        Keep this page and your receipt. Our team will check the payment before dispatching your
        order.
      </p>
      <p v-else-if="shipmentState === 'delivered'" class="text-muted mt-3">
        {{ deliveredOn ? `Delivered on ${deliveredOn}.` : 'Your parcel was delivered.' }}
        Thank you for shopping with us.
      </p>
      <p v-else-if="status.lifecycleState === 'confirmed'" class="text-muted mt-3">
        Your receipt is being sent to {{ status.order.email }}.
      </p>
      <p v-else-if="waiting && !status.closing" class="text-muted mt-3">
        Return here after paying. Payment confirmation may take a moment.
      </p>
      <p v-else-if="status.lifecycleState === 'expired'" class="text-muted mt-3">
        The stock hold has ended. Start a new order to check current availability.
      </p>
    </div>
    <UCard v-if="waiting" class="mb-6">
      <div class="flex flex-wrap items-center gap-3">
        <UButton
          v-if="status.checkoutUrl"
          :href="status.checkoutUrl"
          external
          label="Pay now"
          icon="i-lucide-credit-card"
        />
        <UIcon v-else name="i-lucide-loader-circle" class="animate-spin text-muted size-5" />
        <Form
          v-slot="{ processing }"
          route="checkout.reconciliations.store"
          :params="{ publicId: status.publicId }"
          :options="{ preserveScroll: true }"
        >
          <UButton type="submit" label="Check payment" variant="soft" :loading="processing" />
        </Form>
        <Form
          v-if="!status.closing"
          v-slot="{ processing }"
          route="checkout.cancellations.store"
          :params="{ publicId: status.publicId }"
          :options="{ preserveScroll: true }"
        >
          <UButton
            type="submit"
            label="Cancel checkout"
            color="neutral"
            variant="ghost"
            :loading="processing"
          />
        </Form>
      </div>
      <p v-if="status.expiresAtMs" class="text-xs text-muted mt-4">
        Stock hold ends {{ new Date(status.expiresAtMs).toLocaleTimeString() }}.
      </p>
    </UCard>
    <UCard v-if="status.shipment && dispatched" class="mb-6">
      <h2 class="font-semibold">
        {{ shipmentState === 'delivered' ? 'Delivered' : 'Delivery tracking' }}
      </h2>
      <p class="text-sm mt-2">
        {{ status.shipment.carrier }} · {{ status.shipment.trackingNumber }}
      </p>
      <UButton
        v-if="status.shipment.trackingUrl"
        :href="status.shipment.trackingUrl"
        external
        label="Track delivery"
        variant="soft"
        class="mt-3"
      />
    </UCard>
    <UCard>
      <template #header><h2 class="font-semibold">Order details</h2></template>
      <ul class="space-y-4">
        <li
          v-for="line in status.order.lineItems"
          :key="line.id"
          class="flex justify-between gap-4 text-sm"
        >
          <div>
            <p class="font-medium">{{ line.title }}</p>
            <p class="text-muted">{{ line.variantTitle }} · Qty {{ line.quantity }}</p>
          </div>
          <span>{{
            new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(
              line.totalAmount
            )
          }}</span>
        </li>
      </ul>
      <dl class="mt-5 pt-5 border-t border-default space-y-3">
        <div v-if="status.discountMinor" class="flex justify-between text-sm">
          <dt>Discount{{ status.order.discountCode ? ` (${status.order.discountCode})` : '' }}</dt>
          <dd>−{{ money(status.discountMinor) }}</dd>
        </div>
        <div class="flex justify-between text-sm">
          <dt>Shipping</dt>
          <dd>{{ money(status.shippingMinor) }}</dd>
        </div>
        <div class="flex justify-between font-semibold">
          <dt>Total</dt>
          <dd>{{ money(status.amountMinor) }}</dd>
        </div>
      </dl>
      <div v-if="status.order.shippingAddress" class="mt-6 pt-5 border-t border-default">
        <h3 class="font-medium mb-2">Delivery address</h3>
        <p
          v-for="line in status.order.shippingAddress.formatted"
          :key="line"
          class="text-sm text-muted"
        >
          {{ line }}
        </p>
      </div>
      <p v-for="refund in status.refunds" :key="refund.id" class="text-sm mt-4">
        Refund {{ money(refund.amountMinor) }} · {{ refund.state }}
      </p>
    </UCard>
    <UCard v-if="conversation" class="mt-6" :ui="{ body: 'p-0 sm:p-0 flex flex-col h-[28rem]' }">
      <template #header>
        <h2 class="font-semibold">Messages</h2>
        <p class="text-sm text-muted mt-1">Ask the store team anything about this order.</p>
      </template>
      <OrderChat :conversation="conversation" side="customer" />
    </UCard>
    <div class="flex flex-wrap items-center gap-4 mt-6">
      <Form
        v-if="canClaim"
        v-slot="{ processing }"
        route="checkout.access.store"
        :params="{ publicId: status.publicId }"
      >
        <UButton type="submit" label="Save to my account" variant="soft" :loading="processing" />
      </Form>
      <Link v-else-if="!page.props.user" route="session.create" class="text-sm text-primary"
        >Sign in to save this order</Link
      >
      <Link route="home" class="text-sm text-primary">Continue shopping</Link>
    </div>
  </UContainer>
</template>

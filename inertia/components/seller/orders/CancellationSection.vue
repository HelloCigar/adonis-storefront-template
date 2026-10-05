<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Form } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import { useOrderInteraction } from './interaction'
import { orderLabel, orderMoney } from './presentation'

const props = defineProps<{ order: Data.Seller.Order; operations: Data.Seller.OrderOperations }>()
const { locked, callbacks, requestOptions } = useOrderInteraction()
const confirmed = ref(false)
watch(
  () => props.operations,
  () => {
    confirmed.value = false
  }
)

const preview = computed(() => props.operations.cancellation)
const money = (amountMinor: number, currency: string) => orderMoney(amountMinor / 100, currency)
const units = (count: number) => `${count} ${count === 1 ? 'unit' : 'units'}`
const newRefunds = computed(() => preview.value?.refunds.filter((refund) => !refund.existing) ?? [])
const refundTotal = computed(() =>
  newRefunds.value.map((refund) => money(refund.amountMinor, refund.currency)).join(' and ')
)
const consequences = computed(() => {
  const value = preview.value
  if (!value) return []
  const lines: string[] = []
  if (value.closesCheckout)
    lines.push(
      value.returnedQuantity
        ? `Closes the unpaid checkout. ${units(value.returnedQuantity)} of held stock return once the provider confirms it is closed.`
        : 'Closes the unpaid checkout once the provider confirms it is unpaid.'
    )
  for (const refund of value.refunds)
    lines.push(
      refund.existing
        ? `Keeps the ${money(refund.amountMinor, refund.currency)} refund already in progress.`
        : `Requests a ${money(refund.amountMinor, refund.currency)} refund to the ${orderLabel(refund.provider)} payment. It stays pending until the provider confirms it.`
    )
  if (!value.closesCheckout && value.returnedQuantity)
    lines.push(`Returns ${units(value.returnedQuantity)} to stock.`)
  if (!lines.length) lines.push('No refund or stock change is needed.')
  return lines
})
const confirmation = computed(() =>
  refundTotal.value
    ? `I confirm cancelling this order and refunding ${refundTotal.value}.`
    : 'I confirm cancelling this order.'
)
</script>

<template>
  <section aria-labelledby="order-cancel-title" class="border-t border-default pt-5">
    <h2 id="order-cancel-title" class="text-base font-semibold text-highlighted">Cancel order</h2>
    <p v-if="operations.cancelBlocker" class="mt-2 text-sm text-default">
      {{ operations.cancelBlocker }}
    </p>
    <p v-else-if="operations.cancellationPending" class="mt-2 text-sm text-default">
      Cancellation is already requested. Refresh status to check the confirmed outcome.
    </p>
    <details v-else-if="preview" class="mt-2">
      <summary
        class="cursor-pointer text-sm font-medium text-error w-fit focus-visible:outline-2 focus-visible:outline-error"
      >
        Review what cancelling does
      </summary>
      <ul
        class="mt-3 mb-4 max-w-prose list-disc space-y-1.5 pl-5 text-sm text-default marker:text-muted"
      >
        <li v-for="line in consequences" :key="line">{{ line }}</li>
      </ul>
      <UCheckbox v-model="confirmed" :label="confirmation" :disabled="locked" class="mb-4" />
      <Form
        v-slot="{ processing }"
        v-bind="callbacks"
        :options="requestOptions"
        disable-while-processing
        route="seller.cancellations.store"
        :params="{ id: order.id }"
        ><UButton
          type="submit"
          :label="refundTotal ? `Cancel and refund ${refundTotal}` : 'Cancel order'"
          color="error"
          variant="soft"
          :loading="processing"
          :disabled="processing || locked || !confirmed"
      /></Form>
    </details>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Form } from '@adonisjs/inertia/vue'
import type { HttpResponse } from '@inertiajs/core'
import type { Data } from '@generated/data'
import { useOrderInteraction } from './interaction'
import { orderLabel, orderMoney } from './presentation'

const props = defineProps<{
  order: Data.Seller.Order
  operations: Data.Seller.OrderOperations
}>()
const open = defineModel<boolean>('open', { required: true })
const { locked, callbacks, requestOptions } = useOrderInteraction()
const confirmed = ref(false)
watch(
  () => props.operations,
  () => {
    confirmed.value = false
  }
)
watch(open, (value) => {
  if (value) confirmed.value = false
})

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
// A failed or uncertain request closes the dialog so the page-level alert is visible.
const options = {
  ...requestOptions,
  onHttpException: (response: HttpResponse) => {
    open.value = false
    return requestOptions.onHttpException(response)
  },
  onNetworkError: () => {
    open.value = false
    return requestOptions.onNetworkError()
  },
}
</script>

<template>
  <UModal v-model:open="open" title="Cancel this order?" description="Review what cancelling does.">
    <template #body>
      <Form
        v-slot="{ processing }"
        v-bind="callbacks"
        :options="options"
        disable-while-processing
        route="seller.cancellations.store"
        :params="{ id: order.id }"
        class="space-y-4"
        @success="open = false"
      >
        <ul class="max-w-prose list-disc space-y-1.5 pl-5 text-sm text-default marker:text-muted">
          <li v-for="line in consequences" :key="line">{{ line }}</li>
        </ul>
        <UCheckbox v-model="confirmed" :label="confirmation" :disabled="locked" />
        <div class="flex justify-end gap-2">
          <UButton
            type="button"
            label="Keep order"
            color="neutral"
            variant="outline"
            :disabled="processing"
            @click="open = false"
          />
          <UButton
            type="submit"
            :label="refundTotal ? `Cancel and refund ${refundTotal}` : 'Cancel order'"
            color="error"
            :loading="processing"
            :disabled="processing || locked || !confirmed"
          />
        </div>
      </Form>
    </template>
  </UModal>
</template>

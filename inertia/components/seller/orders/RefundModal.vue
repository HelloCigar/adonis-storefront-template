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

const choices = computed(() =>
  props.operations.payments
    .filter((action) => action.canRefund)
    .flatMap((action) => {
      const payment = props.order.payments.find((row) => row.id === action.paymentId)
      return payment ? [{ ...payment, refundable: action.refundableAmountMinor }] : []
    })
)
const selectedId = ref<string>()
const confirmed = ref(false)
const selected = computed(
  () => choices.value.find((choice) => choice.id === selectedId.value) ?? choices.value[0]
)
const amount = computed(() =>
  selected.value ? orderMoney(selected.value.refundable / 100, selected.value.currency) : ''
)
const paymentLabel = (choice: (typeof choices.value)[number]) =>
  `${orderLabel(choice.provider)} payment ${choice.externalId}`
const items = computed(() =>
  choices.value.map((choice) => ({
    value: choice.id,
    label: paymentLabel(choice),
    description: `${orderMoney(choice.refundable / 100, choice.currency)} remaining`,
  }))
)
// A new order state or a different payment needs a fresh acknowledgement.
watch(
  () => props.operations,
  () => {
    confirmed.value = false
  }
)
watch(selectedId, () => {
  confirmed.value = false
})
watch(open, (value) => {
  if (value) {
    selectedId.value = choices.value[0]?.id
    confirmed.value = false
  }
})
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
  <UModal
    v-model:open="open"
    title="Refund a payment"
    description="Refunds go back to the original payment and stay pending until the provider confirms them."
  >
    <template #body>
      <Form
        v-if="selected"
        v-slot="{ processing }"
        v-bind="callbacks"
        :options="options"
        disable-while-processing
        route="seller.refunds.store"
        :params="{ id: order.id }"
        class="space-y-4"
        @success="open = false"
      >
        <input type="hidden" name="paymentId" :value="selected.id" />
        <URadioGroup
          v-if="choices.length > 1"
          v-model="selectedId"
          legend="Payment to refund"
          :items="items"
        />
        <p v-else class="text-sm text-default [overflow-wrap:anywhere]">
          {{ paymentLabel(selected) }}
        </p>
        <p class="text-sm text-default max-w-prose">
          Requests a refund of the remaining {{ amount }}. It stays pending until the provider
          confirms it. A refund blocks dispatch but does not return stock; cancelling the order
          does.
        </p>
        <!-- Keyed so its accessible name follows the selected payment's amount. -->
        <UCheckbox
          :key="selected.id"
          v-model="confirmed"
          :label="`I confirm refunding ${amount} to this payment.`"
          :disabled="locked"
        />
        <div class="flex justify-end gap-2">
          <UButton
            type="button"
            label="Keep payment"
            color="neutral"
            variant="outline"
            :disabled="processing"
            @click="open = false"
          />
          <UButton
            type="submit"
            :label="`Request refund of ${amount}`"
            icon="i-lucide-undo-2"
            :loading="processing"
            :disabled="processing || locked || !confirmed"
          />
        </div>
      </Form>
    </template>
  </UModal>
</template>

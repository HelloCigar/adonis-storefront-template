<script setup lang="ts">
import { computed } from 'vue'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Data } from '@generated/data'
import { useOrderInteraction } from './interaction'

const props = defineProps<{
  order: Data.Seller.Order
  operations: Data.Seller.OrderOperations
}>()
const emit = defineEmits<{ refund: []; cancel: [] }>()
const { locked } = useOrderInteraction()

const refundable = computed(() => props.operations.payments.some((payment) => payment.canRefund))
const cancellable = computed(
  () => props.operations.canCancel && !props.operations.cancellationPending
)
/** Why Cancel order is unavailable. Shipped and closed orders carry no blocker of their own. */
const cancelReason = computed(() => {
  if (props.operations.cancelBlocker) return props.operations.cancelBlocker
  if (props.operations.cancellationPending)
    return 'Cancellation is already requested. Refresh status to check the confirmed outcome.'
  if (['shipped', 'delivered'].includes(props.order.shipment?.state ?? ''))
    return 'Orders can’t be cancelled after they ship.'
  if (['cancelled', 'expired'].includes(props.order.lifecycleState))
    return 'This order is already closed.'
  return undefined
})
const items = computed<DropdownMenuItem[]>(() => [
  {
    label: 'Refund',
    icon: 'i-lucide-undo-2',
    disabled: !refundable.value || locked.value,
    description: refundable.value
      ? undefined
      : (props.operations.payments.find((payment) => payment.refundBlocker)?.refundBlocker ??
        undefined),
    onSelect: () => emit('refund'),
  },
  {
    label: 'Cancel order',
    icon: 'i-lucide-circle-x',
    color: 'error',
    disabled: !cancellable.value || locked.value,
    description: cancellable.value ? undefined : cancelReason.value,
    onSelect: () => emit('cancel'),
  },
])
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align: 'end' }" :ui="{ content: 'max-w-80' }">
    <UButton
      label="More actions"
      trailing-icon="i-lucide-chevron-down"
      color="neutral"
      variant="outline"
    />
  </UDropdownMenu>
</template>

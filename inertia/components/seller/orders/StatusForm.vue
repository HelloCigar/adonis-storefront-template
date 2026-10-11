<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import { useOrderInteraction } from './interaction'
import { statusOptions } from '~/utils/status'
defineProps<{ order: Data.Seller.Order }>()
const emit = defineEmits<{ saved: [] }>()
const { locked, callbacks, requestOptions } = useOrderInteraction()
</script>
<template>
  <Form
    v-slot="{ errors, processing }"
    v-bind="callbacks"
    :options="requestOptions"
    disable-while-processing
    route="seller.orders.update"
    :params="{ id: order.id }"
    :transform="(data) => ({ ...data, note: data.note || null })"
    class="space-y-4"
    @success="emit('saved')"
  >
    <div v-if="order.source === 'online'">
      <input type="hidden" name="financialStatus" :value="order.financialStatus" />
      <input type="hidden" name="fulfillmentStatus" :value="order.fulfillmentStatus" />
    </div>
    <UFormField v-else name="financialStatus" label="Payment status" :error="errors.financialStatus"
      ><USelect
        name="financialStatus"
        :default-value="order.financialStatus"
        :items="statusOptions('payment')"
        class="w-full"
    /></UFormField>
    <UFormField
      v-if="order.source !== 'online'"
      name="fulfillmentStatus"
      label="Fulfillment status"
      :error="errors.fulfillmentStatus"
      ><USelect
        name="fulfillmentStatus"
        :default-value="order.fulfillmentStatus"
        :items="statusOptions('fulfillment')"
        class="w-full"
    /></UFormField>
    <UFormField name="note" label="Note" :error="errors.note"
      ><UTextarea name="note" :default-value="order.note || ''" class="w-full" :rows="4"
    /></UFormField>
    <p class="text-xs text-muted">
      {{
        order.source === 'online'
          ? 'Only staff see changes to this note. Payment and shipping actions set the order status.'
          : 'Status changes record your manual payment and fulfillment updates.'
      }}
    </p>
    <UButton
      type="submit"
      :label="order.source === 'online' ? 'Save note' : 'Save changes'"
      :loading="processing"
      :disabled="processing || locked"
    />
  </Form>
</template>

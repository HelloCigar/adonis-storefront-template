<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { useOrderInteraction } from './interaction'

defineProps<{ orderId: string; refundId: string }>()
const { locked, callbacks, requestOptions } = useOrderInteraction()
</script>

<template>
  <Form
    v-slot="{ errors, processing }"
    v-bind="callbacks"
    :options="requestOptions"
    disable-while-processing
    route="seller.operations.store"
    :params="{ id: orderId }"
    class="space-y-3"
    ><input type="hidden" name="kind" value="refund" /><input
      type="hidden"
      name="operationId"
      :value="refundId" /><UFormField
      label="Provider refund reference"
      name="externalId"
      hint="Optional"
      help="Leave blank to recheck the saved refund."
      :error="errors.externalId"
      ><UInput name="externalId" maxlength="255" autocomplete="off" class="w-full" /></UFormField
    ><UButton
      type="submit"
      label="Recheck refund with provider"
      icon="i-lucide-refresh-cw"
      variant="soft"
      :loading="processing"
      :disabled="processing || locked"
  /></Form>
</template>

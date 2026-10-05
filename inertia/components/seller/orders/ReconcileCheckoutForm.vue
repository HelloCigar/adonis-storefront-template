<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import { useOrderInteraction } from './interaction'
import { operationMessage } from './presentation'

defineProps<{ order: Data.Seller.Order; attempt: NonNullable<Data.Seller.Order['attempt']> }>()
const { locked, callbacks, requestOptions } = useOrderInteraction()
</script>

<template>
  <Form
    v-slot="{ errors, processing }"
    v-bind="callbacks"
    :options="requestOptions"
    disable-while-processing
    route="seller.operations.store"
    :params="{ id: order.id }"
    class="space-y-3 max-w-xl"
  >
    <input type="hidden" name="kind" value="payment" /><input
      type="hidden"
      name="operationId"
      :value="attempt.id"
    />
    <p v-if="attempt.lastError" class="text-sm text-default break-words">
      {{ operationMessage(attempt.lastError, 'payment') }}
    </p>
    <UFormField
      label="Provider checkout reference"
      name="externalId"
      hint="Optional"
      help="Leave blank to recheck the saved checkout. Enter a reference only if the provider shows a different checkout for this order."
      :error="errors.externalId"
      ><UInput name="externalId" maxlength="255" autocomplete="off" class="w-full"
    /></UFormField>
    <UButton
      type="submit"
      label="Recheck payment with provider"
      icon="i-lucide-refresh-cw"
      :loading="processing"
      :disabled="processing || locked"
    />
  </Form>
</template>

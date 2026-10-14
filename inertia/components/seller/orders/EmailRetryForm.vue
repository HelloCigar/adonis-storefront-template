<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import { useOrderInteraction } from './interaction'

defineProps<{ orderId: string; notificationId: string; kind: string }>()
const { locked, callbacks, requestOptions } = useOrderInteraction()
</script>

<template>
  <Form
    v-slot="{ processing }"
    v-bind="callbacks"
    :options="requestOptions"
    disable-while-processing
    route="seller.operations.store"
    :params="{ id: orderId }"
    ><input type="hidden" name="kind" value="notification" /><input
      type="hidden"
      name="operationId"
      :value="notificationId" /><UButton
      type="submit"
      :label="`Retry ${kind} email`"
      icon="i-lucide-refresh-cw"
      variant="outline"
      color="neutral"
      size="sm"
      :loading="processing"
      :disabled="processing || locked"
  /></Form>
</template>

<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import { useOrderInteraction } from './interaction'
import PickList from './PickList.vue'

defineProps<{ order: Data.Seller.Order }>()
const { locked, callbacks, requestOptions } = useOrderInteraction()
</script>

<template>
  <div>
    <PickList :items="order.lineItems ?? []" heading-id="order-pick-list" />
    <Form
      v-slot="{ processing }"
      v-bind="callbacks"
      :options="requestOptions"
      disable-while-processing
      route="seller.packing.store"
      :params="{ id: order.id }"
      class="mt-5"
      ><UButton
        type="submit"
        label="Start packing"
        icon="i-lucide-package"
        :loading="processing"
        :disabled="processing || locked"
    /></Form>
  </div>
</template>

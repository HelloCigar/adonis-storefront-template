<script setup lang="ts">
import { computed } from 'vue'
import { Form } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import { useOrderInteraction } from './interaction'
import PickList from './PickList.vue'
import ShippingAddress from './ShippingAddress.vue'

const props = defineProps<{ order: Data.Seller.Order }>()
const { locked, callbacks, requestOptions } = useOrderInteraction()
const shippingAddress = computed(
  () =>
    props.order.addresses?.find((address) => address.type === 'shipping') ??
    props.order.addresses?.[0] ??
    null
)
</script>

<template>
  <div class="@container">
    <div class="grid gap-6 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div class="min-w-0 space-y-5">
        <ShippingAddress :address="shippingAddress" heading-id="order-ship-to" />
        <PickList
          :items="order.lineItems ?? []"
          title="In this parcel"
          heading-id="order-parcel-contents"
        />
      </div>
      <div id="order-ship-form" class="@container min-w-0">
        <Form
          v-slot="{ errors, processing }"
          v-bind="callbacks"
          :options="requestOptions"
          disable-while-processing
          route="seller.shipments.store"
          :params="{ id: order.id }"
          class="space-y-4"
        >
          <div class="grid @lg:grid-cols-2 gap-4">
            <UFormField label="Carrier" name="carrier" :error="errors.carrier" required
              ><UInput
                name="carrier"
                required
                minlength="2"
                maxlength="100"
                autocomplete="off"
                class="w-full" /></UFormField
            ><UFormField
              label="Tracking number"
              name="trackingNumber"
              :error="errors.trackingNumber"
              required
              ><UInput
                name="trackingNumber"
                required
                minlength="2"
                maxlength="255"
                autocomplete="off"
                class="w-full"
            /></UFormField>
          </div>
          <UFormField
            label="Tracking URL"
            name="trackingUrl"
            :error="errors.trackingUrl"
            hint="Optional"
            ><UInput
              name="trackingUrl"
              type="url"
              maxlength="2048"
              placeholder="https://"
              class="w-full"
          /></UFormField>
          <p class="text-sm text-default [overflow-wrap:anywhere]">
            <template v-if="order.email"
              >Saving emails this tracking to <bdi class="font-medium">{{ order.email }}</bdi
              >.
            </template>
            Tracking can’t be changed after it is saved, so check the number first.
          </p>
          <UButton
            type="submit"
            label="Mark as shipped"
            icon="i-lucide-truck"
            :loading="processing"
            :disabled="processing || locked"
          />
        </Form>
      </div>
    </div>
  </div>
</template>

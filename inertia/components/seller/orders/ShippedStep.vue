<script setup lang="ts">
import { computed } from 'vue'
import { Form } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import { useOrderInteraction } from './interaction'
import { orderDate } from './presentation'

const props = defineProps<{ order: Data.Seller.Order; canDeliver: boolean }>()
const { locked, callbacks, requestOptions } = useOrderInteraction()
const delivered = computed(() => props.order.shipment?.state === 'delivered')
/** Only web links are offered; anything else in historical records is not rendered. */
const trackingUrl = computed(() => {
  try {
    const url = new URL(props.order.shipment?.trackingUrl || '')
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
})
</script>

<template>
  <div>
    <dl class="grid gap-4 sm:grid-cols-2 text-sm">
      <div>
        <dt class="text-muted">Shipped</dt>
        <dd class="mt-1 font-medium text-highlighted">
          {{ orderDate(order.shipment?.shippedAt) }}
        </dd>
      </div>
      <div>
        <dt class="text-muted">Delivered</dt>
        <dd class="mt-1 font-medium text-highlighted">
          {{ delivered ? orderDate(order.shipment?.deliveredAt) : 'Not yet confirmed' }}
        </dd>
      </div>
      <div>
        <dt class="text-muted">Carrier</dt>
        <dd class="mt-1 font-medium text-highlighted break-words">
          {{ order.shipment?.carrier || 'Not provided' }}
        </dd>
      </div>
      <div>
        <dt class="text-muted">Tracking number</dt>
        <dd class="mt-1 font-medium text-highlighted break-all tabular-nums">
          {{ order.shipment?.trackingNumber || 'Not provided' }}
        </dd>
      </div>
    </dl>
    <UButton
      v-if="trackingUrl"
      :href="trackingUrl"
      target="_blank"
      rel="noopener noreferrer"
      label="Track shipment"
      icon="i-lucide-external-link"
      variant="outline"
      color="neutral"
      class="mt-4"
    />
    <Form
      v-if="canDeliver"
      v-slot="{ processing }"
      v-bind="callbacks"
      :options="requestOptions"
      disable-while-processing
      route="seller.deliveries.store"
      :params="{ id: order.id }"
      class="mt-5 border-t border-default pt-5"
    >
      <p class="text-sm text-default max-w-prose [overflow-wrap:anywhere]">
        Confirm delivery only after the carrier reports it.
        <template v-if="order.email"
          >Saving emails a delivery confirmation to <bdi class="font-medium">{{ order.email }}</bdi
          >.</template
        >
      </p>
      <UButton
        type="submit"
        label="Mark as delivered"
        icon="i-lucide-package-check"
        class="mt-3"
        :loading="processing"
        :disabled="processing || locked"
      />
    </Form>
  </div>
</template>

<script setup lang="ts">
import type { Data } from '@generated/data'
import NextStep from './NextStep.vue'
import StatusForm from './StatusForm.vue'

defineProps<{ order: Data.Seller.Order; queue: Data.Seller.OrderQueueItem }>()
</script>

<template>
  <section aria-labelledby="manual-order-title" class="rounded-lg bg-elevated/50 p-5 sm:p-6">
    <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
      Next step
      <NextStep
        :step="queue.nextStep"
        :waiting-since="queue.waitingSince"
        class="normal-case tracking-normal font-normal"
      />
    </p>
    <h2 id="manual-order-title" class="text-xl font-semibold text-highlighted mt-1">
      Record payment and fulfillment
    </h2>
    <p class="text-sm text-muted mt-2 mb-5 max-w-prose">
      This manual order has no hosted payment or shipment workflow. Record the payment and
      fulfillment outcome here as work is completed.
    </p>
    <div class="max-w-xl"><StatusForm :order="order" /></div>
  </section>
</template>

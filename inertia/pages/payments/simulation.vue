<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { Form, Link } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'

defineProps<{ simulation: Data.Payments.Simulation }>()
const money = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount / 100)
</script>

<template>
  <Head title="Local payment simulator" />
  <UContainer class="py-8 lg:py-12 max-w-2xl">
    <UBadge label="Development only" color="warning" variant="soft" class="mb-4" />
    <h1 class="text-3xl font-semibold text-highlighted">Local payment simulator</h1>
    <p class="text-muted mt-3 mb-6">
      Fake PayMongo checkout. No money is charged and no payment details are needed.
    </p>
    <UCard>
      <div class="space-y-3">
        <div
          v-for="(item, index) in simulation.items"
          :key="index"
          class="flex justify-between gap-4"
        >
          <span
            >{{ item.name }} <span class="text-muted">× {{ item.quantity }}</span></span
          >
          <span>{{ money(item.unitAmount * item.quantity) }}</span>
        </div>
        <div class="flex justify-between border-t border-default pt-4 font-semibold">
          <span>Total</span><span>{{ money(simulation.amountMinor) }}</span>
        </div>
      </div>
      <p v-if="simulation.failed" role="status" class="text-error mt-6">
        Payment failed. The checkout remains open so you can try again.
      </p>
      <p v-if="simulation.status !== 'pending'" role="status" class="mt-6">
        This checkout is {{ simulation.status }}.
      </p>
      <div v-if="simulation.status === 'pending'" class="mt-6 flex flex-wrap gap-3">
        <Form
          v-slot="{ processing }"
          route="payments.simulations.store"
          :params="{ id: simulation.id }"
        >
          <input type="hidden" name="outcome" value="paid" />
          <UButton type="submit" label="Simulate successful payment" :loading="processing" />
        </Form>
        <Form
          v-slot="{ processing }"
          route="payments.simulations.store"
          :params="{ id: simulation.id }"
        >
          <input type="hidden" name="outcome" value="failed" />
          <UButton
            type="submit"
            label="Simulate failed payment"
            color="error"
            variant="soft"
            :loading="processing"
          />
        </Form>
        <Form
          v-slot="{ processing }"
          route="payments.simulations.store"
          :params="{ id: simulation.id }"
        >
          <input type="hidden" name="outcome" value="expired" />
          <UButton
            type="submit"
            label="Expire checkout"
            color="neutral"
            variant="outline"
            :loading="processing"
          />
        </Form>
        <Form
          v-slot="{ processing }"
          route="payments.simulations.store"
          :params="{ id: simulation.id }"
        >
          <input type="hidden" name="outcome" value="paid_without_notification" />
          <UButton
            type="submit"
            label="Pay without notification"
            color="neutral"
            variant="outline"
            :loading="processing"
          />
        </Form>
      </div>
      <p v-if="simulation.status === 'pending'" class="text-sm text-muted mt-4">
        “Pay without notification” confirms at the gateway and lets the normal payment lookup
        recover the confirmation.
      </p>
    </UCard>
    <Link
      route="checkout.orders.show"
      :params="{ publicId: simulation.reference }"
      class="inline-block mt-6 text-primary"
      >Return to order</Link
    >
  </UContainer>
</template>

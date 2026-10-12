<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { Form } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import StoreIdentityFields from '~/components/settings/StoreIdentityFields.vue'
import ShippingFeeField from '~/components/settings/ShippingFeeField.vue'

defineProps<{ settings: Data.Settings.StoreSetting }>()
</script>

<template>
  <Head title="Store settings" />
  <Form
    v-slot="{ processing, errors }"
    route="settings.store.update"
    :options="{ preserveScroll: true }"
  >
    <UPageCard
      title="Store"
      description="How your store appears to shoppers and what shipping costs."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        label="Save"
        type="submit"
        :loading="processing"
        :disabled="processing"
        class="w-fit lg:ms-auto"
      />
    </UPageCard>
    <UPageCard variant="subtle">
      <StoreIdentityFields :settings="settings" :errors="errors" />
      <USeparator />
      <ShippingFeeField :shipping-fee="settings.shippingFee" :error="errors.shippingFee" />
    </UPageCard>
  </Form>
</template>

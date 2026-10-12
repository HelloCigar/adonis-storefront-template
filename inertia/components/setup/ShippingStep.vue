<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import ShippingFeeField from '~/components/settings/ShippingFeeField.vue'

defineProps<{ settings: Data.Settings.StoreSetting.Variants['forSetup'] }>()
</script>

<template>
  <Form
    v-slot="{ processing, errors }"
    route="setup.update"
    :params="{ step: 'shipping' }"
    :options="{ preserveScroll: true }"
  >
    <UPageCard title="Shipping" description="One flat fee for every order." variant="subtle">
      <ShippingFeeField :shipping-fee="settings.shippingFee" :error="errors.shippingFee" />
      <div class="flex justify-end">
        <UButton label="Continue" type="submit" :loading="processing" :disabled="processing" />
      </div>
    </UPageCard>
  </Form>
</template>

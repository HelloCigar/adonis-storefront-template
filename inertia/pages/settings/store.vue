<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { Form } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import StoreIdentityFields from '~/components/settings/StoreIdentityFields.vue'
import ShippingFeeField from '~/components/settings/ShippingFeeField.vue'
import ShoppingAssistantSettingField from '~/components/settings/ShoppingAssistantSettingField.vue'
import DashboardCopilotSettingField from '~/components/settings/DashboardCopilotSettingField.vue'

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
  <section class="mt-8">
    <UPageCard
      title="Shopping assistant"
      description="An AI assistant on the storefront. It answers from your store's public content and each shopper's own orders."
      variant="naked"
      class="mb-4"
    />
    <UPageCard variant="subtle">
      <ShoppingAssistantSettingField :shopping-assistant="settings.shoppingAssistant" />
    </UPageCard>
  </section>
  <section class="mt-8">
    <UPageCard
      title="Copilot"
      description="An AI copilot on every dashboard page. It answers from what each person can see and proposes changes they confirm."
      variant="naked"
      class="mb-4"
    />
    <UPageCard variant="subtle">
      <DashboardCopilotSettingField :dashboard-copilot="settings.dashboardCopilot" />
    </UPageCard>
  </section>
</template>

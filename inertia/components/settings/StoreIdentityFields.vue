<script setup lang="ts">
import type { Data } from '@generated/data'

defineProps<{
  settings: Pick<Data.Settings.StoreSetting, 'storeName' | 'contactEmail'>
  errors: Partial<Record<'storeName' | 'contactEmail', string>>
}>()
</script>

<template>
  <UFormField
    name="storeName"
    label="Store name"
    description="Shown on your storefront, emails, and invoices."
    :error="errors.storeName"
    required
    class="flex max-sm:flex-col justify-between items-start gap-4"
  >
    <UInput
      name="storeName"
      :default-value="settings.storeName"
      autocomplete="organization"
      class="w-full sm:w-72"
    />
  </UFormField>
  <USeparator />
  <UFormField
    name="contactEmail"
    label="Contact email"
    description="Where shoppers reach you and where their replies arrive."
    :error="errors.contactEmail"
    required
    class="flex max-sm:flex-col justify-between items-start gap-4"
  >
    <UInput
      name="contactEmail"
      inputmode="email"
      :default-value="settings.contactEmail"
      autocomplete="email"
      class="w-full sm:w-72"
    />
  </UFormField>
</template>

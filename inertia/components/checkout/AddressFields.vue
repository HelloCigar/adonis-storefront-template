<script setup lang="ts">
defineProps<{ prefix: 'shipping' | 'billing'; errors: Record<string, string> }>()
const fields = [
  { key: 'firstName', label: 'First name', autocomplete: 'given-name' },
  { key: 'lastName', label: 'Last name', autocomplete: 'family-name' },
  { key: 'phoneNumber', label: 'Phone number', autocomplete: 'tel', type: 'tel' },
  { key: 'address1', label: 'Street address', autocomplete: 'address-line1', wide: true },
  {
    key: 'address2',
    label: 'Apartment, unit, etc.',
    autocomplete: 'address-line2',
    optional: true,
    wide: true,
  },
  { key: 'city', label: 'City / municipality', autocomplete: 'address-level2' },
  { key: 'zoneCode', label: 'Province / region', autocomplete: 'address-level1' },
  { key: 'postalCode', label: 'Postal code', autocomplete: 'postal-code' },
]
</script>
<template>
  <div class="grid sm:grid-cols-2 gap-4">
    <input type="hidden" :name="`${prefix}[countryCode]`" value="PH" />
    <UFormField
      v-for="field in fields"
      :key="field.key"
      :name="`${prefix}.${field.key}`"
      :label="field.label"
      :required="!field.optional"
      :hint="field.optional ? 'Optional' : undefined"
      :error="errors[`${prefix}.${field.key}`]"
      :class="field.wide ? 'sm:col-span-2' : ''"
    >
      <UInput
        :name="`${prefix}[${field.key}]`"
        :type="field.type || 'text'"
        :autocomplete="`${prefix} ${field.autocomplete}`"
        :required="!field.optional"
        class="w-full"
      />
    </UFormField>
  </div>
</template>

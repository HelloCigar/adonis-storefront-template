<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import StoreIdentityFields from '~/components/settings/StoreIdentityFields.vue'

defineProps<{ settings: Data.Settings.StoreSetting.Variants['forSetup'] }>()
</script>

<template>
  <Form
    v-slot="{ processing, errors }"
    route="setup.update"
    :params="{ step: 'identity' }"
    :options="{ preserveScroll: true }"
  >
    <UPageCard
      title="Store details"
      description="The name and email shoppers see."
      variant="subtle"
    >
      <StoreIdentityFields :settings="settings" :errors="errors" />
      <div class="flex justify-end">
        <UButton label="Continue" type="submit" :loading="processing" :disabled="processing" />
      </div>
    </UPageCard>
  </Form>
</template>

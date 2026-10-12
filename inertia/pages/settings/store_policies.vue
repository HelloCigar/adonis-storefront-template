<script setup lang="ts">
import type { JSONContent } from '@tiptap/vue-3'
import { Head } from '@inertiajs/vue3'
import { Form } from '@adonisjs/inertia/vue'
import PolicyEditors from '~/components/settings/PolicyEditors.vue'

defineProps<{
  editablePolicies: {
    handle: string
    title: string
    content: JSONContent | null
    html: string | null
  }[]
}>()
</script>

<template>
  <Head title="Policies" />
  <Form
    v-slot="{ processing, errors }"
    route="settings.store_policies.update"
    :options="{ preserveScroll: true }"
  >
    <UPageCard
      title="Policies"
      description="The policies shoppers can read. Any you leave empty stay off your storefront."
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
      <PolicyEditors :policies="editablePolicies" :errors="errors" />
    </UPageCard>
  </Form>
</template>

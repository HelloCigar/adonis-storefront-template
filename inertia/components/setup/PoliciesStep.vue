<script setup lang="ts">
import type { JSONContent } from '@tiptap/vue-3'
import { Form } from '@adonisjs/inertia/vue'
import PolicyEditors from '~/components/settings/PolicyEditors.vue'

defineProps<{
  policies: {
    handle: string
    title: string
    content: JSONContent | null
    html: string | null
  }[]
}>()
</script>

<template>
  <Form
    v-slot="{ processing, errors }"
    route="setup.update"
    :params="{ step: 'policies' }"
    :options="{ preserveScroll: true }"
  >
    <UPageCard
      title="Policies"
      description="Write the policies shoppers can read. Any you leave empty stay off your storefront."
      variant="subtle"
    >
      <PolicyEditors :policies="policies" :errors="errors" />
      <div class="flex justify-end">
        <UButton label="Finish setup" type="submit" :loading="processing" :disabled="processing" />
      </div>
    </UPageCard>
  </Form>
</template>

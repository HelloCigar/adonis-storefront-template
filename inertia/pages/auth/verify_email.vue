<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { Form } from '@adonisjs/inertia/vue'
import AuthLayout from '~/layouts/auth.vue'

defineProps<{ token: string }>()
</script>

<template>
  <Head title="Verify your email" />

  <AuthLayout>
    <h1 class="text-2xl font-semibold text-highlighted">Verify your email</h1>
    <p class="mt-2 text-sm text-default leading-relaxed">
      Click the button below to confirm your email address.
    </p>

    <Form
      v-slot="{ processing }"
      route="email_verifications.update"
      :params="[token]"
      :options="{ preserveScroll: true }"
      class="mt-8"
    >
      <UButton
        type="submit"
        :label="processing ? 'Verifying…' : 'Verify my email'"
        block
        size="lg"
        :loading="processing"
        :disabled="processing"
        class="min-h-11 text-highlighted dark:text-inverted"
      />
    </Form>
  </AuthLayout>
</template>

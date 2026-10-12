<script setup lang="ts">
import { Head, usePage } from '@inertiajs/vue3'
import { Form } from '@adonisjs/inertia/vue'
import AuthLayout from '~/layouts/auth.vue'

const page = usePage()
</script>

<template>
  <Head title="Verify your account" />

  <AuthLayout>
    <h1 class="text-2xl font-semibold text-highlighted">Verify your account</h1>
    <p class="mt-2 text-sm text-default leading-relaxed">
      Check <strong class="text-highlighted">{{ page.props.user?.unverifiedEmail }}</strong> inbox
      for instructions from us on how to verify your account.
    </p>

    <Form
      v-slot="{ processing }"
      route="email_verifications.store"
      :options="{ preserveScroll: true }"
      class="mt-8"
    >
      <UButton
        type="submit"
        :label="processing ? 'Sending…' : 'Resend activation link'"
        block
        size="lg"
        :loading="processing"
        :disabled="processing"
        class="min-h-11 text-highlighted dark:text-inverted"
      />
    </Form>

    <Form route="session.destroy" class="mt-6 text-center text-sm text-default">
      Wrong account?
      <UButton
        type="submit"
        label="Log out"
        variant="link"
        color="neutral"
        class="p-0 font-semibold text-highlighted underline underline-offset-4"
      />
    </Form>
  </AuthLayout>
</template>

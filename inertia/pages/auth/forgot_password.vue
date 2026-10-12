<script setup lang="ts">
import { ref } from 'vue'
import { Head } from '@inertiajs/vue3'
import AuthLayout from '~/layouts/auth.vue'
import { Form, Link } from '@adonisjs/inertia/vue'

const email = ref('')
</script>

<template>
  <Head title="Forgot password" />

  <AuthLayout>
    <h1 class="text-2xl font-semibold text-highlighted">Forgot password</h1>
    <p class="mt-2 text-sm text-default leading-relaxed">
      Enter the email address you registered with, and we'll send you instructions to reset your
      password
    </p>

    <Form
      v-slot="{ processing, errors }"
      route="password_resets.store"
      :options="{ preserveScroll: true }"
      class="mt-8 flex flex-col gap-5"
    >
      <UFormField label="Email" name="email" :error="errors.email">
        <UInput
          v-model="email"
          name="email"
          type="email"
          autocomplete="email"
          placeholder="you@example.com"
          required
          size="lg"
          class="w-full"
          :ui="{ base: 'min-h-11 placeholder:text-muted' }"
        />
      </UFormField>

      <UButton
        type="submit"
        :label="processing ? 'Sending…' : 'Send instructions'"
        block
        size="lg"
        :loading="processing"
        :disabled="processing"
        class="mt-1 min-h-11 text-highlighted dark:text-inverted"
      />
    </Form>

    <p class="mt-6 text-center text-sm text-default">
      Remembered it?
      <Link
        route="session.create"
        component="auth/login"
        :page-props="{}"
        class="font-semibold text-highlighted underline underline-offset-4 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      >
        Sign in
      </Link>
    </p>
  </AuthLayout>
</template>

<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import AuthLayout from '~/layouts/auth.vue'
import { Form, Link } from '@adonisjs/inertia/vue'
</script>

<template>
  <Head title="Login" />

  <AuthLayout>
    <h1 class="text-2xl font-semibold text-highlighted">Welcome back</h1>
    <p class="mt-1 text-sm text-muted">Sign in to continue building.</p>

    <Form v-slot="{ processing, errors }" route="session.store" class="mt-6 flex flex-col gap-4">
      <UFormField label="Email" name="email" :error="errors.email">
        <UInput
          name="email"
          type="email"
          autocomplete="username"
          placeholder="you@example.com"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Password" name="password" :error="errors.password">
        <UInput
          name="password"
          type="password"
          autocomplete="current-password"
          placeholder="••••••••"
          class="w-full"
        />
      </UFormField>

      <UButton
        type="submit"
        label="Sign in"
        block
        :loading="processing"
        :disabled="processing"
        class="mt-1"
      />
    </Form>

    <p class="mt-5 text-center text-sm text-muted">
      New here?
      <Link
        route="new_account.create"
        view-transition
        component="auth/signup"
        :page-props="{}"
        class="text-primary"
      >
        Create an account
      </Link>
    </p>
  </AuthLayout>
</template>

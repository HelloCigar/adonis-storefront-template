<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import AuthLayout from '~/layouts/auth.vue'
import { Form, Link } from '@adonisjs/inertia/vue'
</script>

<template>
  <Head title="Signup" />

  <AuthLayout>
    <h1 class="text-2xl font-semibold text-highlighted">Create your account</h1>
    <p class="mt-1 text-sm text-muted">Start building with the starter kit.</p>

    <Form
      v-slot="{ processing, errors }"
      route="new_account.store"
      class="mt-6 flex flex-col gap-4"
    >
      <UFormField label="Full name" name="fullName" :error="errors.fullName">
        <UInput
          name="fullName"
          type="text"
          autocomplete="name"
          placeholder="Ada Lovelace"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Email" name="email" :error="errors.email">
        <UInput
          name="email"
          type="email"
          autocomplete="email"
          placeholder="you@example.com"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Password" name="password" :error="errors.password">
        <UInput
          name="password"
          type="password"
          autocomplete="new-password"
          placeholder="••••••••"
          class="w-full"
        />
      </UFormField>

      <UFormField
        label="Confirm password"
        name="passwordConfirmation"
        :error="errors.passwordConfirmation"
      >
        <UInput
          name="passwordConfirmation"
          type="password"
          autocomplete="new-password"
          placeholder="••••••••"
          class="w-full"
        />
      </UFormField>

      <UButton
        type="submit"
        label="Create account"
        block
        :loading="processing"
        :disabled="processing"
        class="mt-1"
      />
    </Form>

    <p class="mt-5 text-center text-sm text-muted">
      Already have an account?
      <Link route="session.create" class="text-primary">Sign in</Link>
    </p>
  </AuthLayout>
</template>

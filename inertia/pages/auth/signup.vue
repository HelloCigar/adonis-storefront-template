<script setup lang="ts">
import { ref } from 'vue'
import { Head } from '@inertiajs/vue3'
import AuthLayout from '~/layouts/auth.vue'
import PasswordInput from '~/components/auth/PasswordInput.vue'
import { Form, Link } from '@adonisjs/inertia/vue'

const fullName = ref('')
const email = ref('')
</script>

<template>
  <Head title="Create account" />

  <AuthLayout>
    <h1 class="text-2xl font-semibold text-highlighted">Create your account</h1>
    <p class="mt-2 text-sm text-default leading-relaxed">
      Keep your orders and delivery details in one place.
    </p>

    <Form
      v-slot="{ processing, errors }"
      route="new_account.store"
      class="mt-8 flex flex-col gap-5"
    >
      <UFormField label="Full name" hint="Optional" name="fullName" :error="errors.fullName">
        <UInput
          v-model="fullName"
          name="fullName"
          type="text"
          autocomplete="name"
          placeholder="Your full name"
          size="lg"
          class="w-full"
          :ui="{ base: 'min-h-11 placeholder:text-muted' }"
        />
      </UFormField>

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

      <UFormField
        label="Password"
        name="password"
        description="Use 8–32 characters."
        :error="errors.password"
      >
        <PasswordInput name="password" autocomplete="new-password" />
      </UFormField>

      <UFormField
        label="Confirm password"
        name="passwordConfirmation"
        :error="errors.passwordConfirmation ? 'Enter the same password in both fields.' : undefined"
      >
        <PasswordInput
          name="passwordConfirmation"
          autocomplete="new-password"
          label="confirm password"
        />
      </UFormField>

      <UButton
        type="submit"
        label="Create account"
        block
        size="lg"
        :loading="processing"
        :disabled="processing"
        class="mt-1 min-h-11 text-highlighted dark:text-inverted"
      />
    </Form>

    <p class="mt-6 text-center text-sm text-default">
      Already have an account?
      <Link
        route="session.create"
        view-transition
        component="auth/login"
        :page-props="{}"
        class="font-semibold text-highlighted underline underline-offset-4 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      >
        Sign in
      </Link>
    </p>
  </AuthLayout>
</template>

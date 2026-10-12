<script setup lang="ts">
import { ref } from 'vue'
import { Head } from '@inertiajs/vue3'
import AuthLayout from '~/layouts/auth.vue'
import PasswordInput from '~/components/auth/PasswordInput.vue'
import PasskeySignIn from '~/components/auth/PasskeySignIn.vue'
import { Form, Link } from '@adonisjs/inertia/vue'

const email = ref('')
</script>

<template>
  <Head title="Sign in" />

  <AuthLayout>
    <h1 class="text-2xl font-semibold text-highlighted">Welcome back</h1>
    <p class="mt-2 text-sm text-default leading-relaxed">
      Sign in to view your orders and manage your account.
    </p>

    <Form v-slot="{ processing, errors }" route="session.store" class="mt-8 flex flex-col gap-5">
      <UFormField label="Email" name="email" :error="errors.email">
        <UInput
          v-model="email"
          name="email"
          type="email"
          autocomplete="username"
          placeholder="you@example.com"
          required
          size="lg"
          class="w-full"
          :ui="{ base: 'min-h-11 placeholder:text-muted' }"
        />
      </UFormField>

      <UFormField label="Password" name="password" :error="errors.password">
        <template #hint>
          <Link
            route="password_resets.create"
            component="auth/forgot_password"
            :page-props="{}"
          >
            Forgot password?
          </Link>
        </template>
        <PasswordInput name="password" autocomplete="current-password" />
      </UFormField>

      <UButton
        type="submit"
        label="Sign in"
        block
        size="lg"
        :loading="processing"
        :disabled="processing"
        class="mt-1 min-h-11 text-highlighted dark:text-inverted"
      />
    </Form>

    <USeparator label="or" class="my-6" />

    <PasskeySignIn />

    <p class="mt-6 text-center text-sm text-default">
      New here?
      <Link
        route="new_account.create"
        component="auth/signup"
        :page-props="{}"
        class="font-semibold text-highlighted underline underline-offset-4 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      >
        Create an account
      </Link>
    </p>
  </AuthLayout>
</template>

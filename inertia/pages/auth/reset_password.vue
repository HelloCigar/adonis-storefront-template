<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { Form } from '@adonisjs/inertia/vue'
import AuthLayout from '~/layouts/auth.vue'
import PasswordInput from '~/components/auth/PasswordInput.vue'
import PasswordStrength from '~/components/auth/PasswordStrength.vue'
import type { PasswordPolicy } from '@adonisplus/persona/password_policy/types'

defineProps<{ token: string; passwordPolicy: PasswordPolicy }>()
</script>

<template>
  <Head title="Reset password" />

  <AuthLayout>
    <h1 class="text-2xl font-semibold text-highlighted">Reset password</h1>
    <p class="mt-2 text-sm text-default leading-relaxed">Choose a new password for your account</p>

    <Form
      v-slot="{ processing, errors }"
      route="password_resets.update"
      :params="[token]"
      :options="{ preserveScroll: true }"
      class="mt-8 flex flex-col gap-5"
    >
      <PasswordStrength :policy="passwordPolicy">
        <UFormField label="Password" name="password" :error="errors.password">
          <PasswordInput name="password" autocomplete="new-password" />
        </UFormField>
      </PasswordStrength>

      <UFormField label="Confirm password" name="passwordConfirmation">
        <PasswordInput
          name="passwordConfirmation"
          autocomplete="new-password"
          label="confirm password"
        />
      </UFormField>

      <UButton
        type="submit"
        :label="processing ? 'Resetting…' : 'Reset password'"
        block
        size="lg"
        :loading="processing"
        :disabled="processing"
        class="mt-1 min-h-11 text-highlighted dark:text-inverted"
      />
    </Form>
  </AuthLayout>
</template>

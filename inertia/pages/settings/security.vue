<script setup lang="ts">
import type { Data } from '@generated/data'
import { Form } from '@adonisjs/inertia/vue'
import PasskeysSettings from '~/components/account/PasskeysSettings.vue'

defineProps<{ passkeys: Data.Account.Passkey[] }>()
</script>

<template>
  <UPageCard
    title="Password"
    description="Confirm your current password before setting a new one."
    variant="subtle"
  >
    <Form
      v-slot="{ processing, errors }"
      route="settings.password.update"
      reset-on-success
      class="flex flex-col gap-4 max-w-xs"
    >
      <UFormField name="currentPassword" label="Current password" :error="errors.currentPassword">
        <UInput
          name="currentPassword"
          type="password"
          autocomplete="current-password"
          class="w-full"
        />
      </UFormField>

      <UFormField name="password" label="New password" :error="errors.password">
        <UInput name="password" type="password" autocomplete="new-password" class="w-full" />
      </UFormField>

      <UFormField
        name="passwordConfirmation"
        label="Confirm new password"
        :error="errors.passwordConfirmation"
      >
        <UInput
          name="passwordConfirmation"
          type="password"
          autocomplete="new-password"
          class="w-full"
        />
      </UFormField>

      <UButton
        label="Update password"
        class="w-fit"
        type="submit"
        :loading="processing"
        :disabled="processing"
      />
    </Form>
  </UPageCard>

  <PasskeysSettings :passkeys="passkeys" />
</template>

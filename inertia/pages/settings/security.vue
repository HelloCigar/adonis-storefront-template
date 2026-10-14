<script setup lang="ts">
import type { Data } from '@generated/data'
import PasswordForm from '~/components/settings/PasswordForm.vue'
import PasskeysSettings from '~/components/account/PasskeysSettings.vue'

defineProps<{ passkeys: Data.Account.Passkey[] }>()
</script>

<template>
  <PasswordForm />

  <PasskeysSettings :passkeys="passkeys" />
</template>

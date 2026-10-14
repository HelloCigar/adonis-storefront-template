<script setup lang="ts">
import { urlFor } from '~/client'
import type { Data } from '@generated/data'
import { t } from '~/utils/store'
import AccountNav from '~/components/account/AccountNav.vue'
import PasswordForm from '~/components/settings/PasswordForm.vue'
import PasskeysSettings from '~/components/account/PasskeysSettings.vue'
import { Head } from '@inertiajs/vue3'
defineProps<{ passkeys: Data.Account.Passkey[] }>()
</script>
<template>
  <Head :title="t('account.nav.security')" />
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb
      :items="[
        { label: t('account.label'), to: urlFor('account.show') },
        { label: t('account.nav.security') },
      ]"
      class="mb-6 lg:mb-8"
    />

    <AccountNav />

    <div class="max-w-2xl flex flex-col gap-6">
      <PasswordForm />

      <PasskeysSettings :passkeys="passkeys" />
    </div>
  </UContainer>
</template>

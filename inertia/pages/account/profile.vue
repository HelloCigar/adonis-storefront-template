<script setup lang="ts">
import { urlFor } from '~/client'
import { t } from '~/utils/store'
import AccountNav from '~/components/account/AccountNav.vue'
import ProfileForm from '~/components/settings/ProfileForm.vue'
import CartRemindersCard from '~/components/account/CartRemindersCard.vue'
import AppearanceCard from '~/components/settings/AppearanceCard.vue'
import { Head } from '@inertiajs/vue3'

defineProps<{ cartRemindersEnabled: boolean }>()
</script>
<template>
  <Head :title="t('account.nav.profile')" />
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb
      :items="[
        { label: t('account.label'), to: urlFor('account.show') },
        { label: t('account.nav.profile') },
      ]"
      class="mb-6 lg:mb-8"
    />

    <AccountNav />

    <div class="max-w-2xl">
      <ProfileForm />
      <CartRemindersCard :enabled="cartRemindersEnabled" />
      <AppearanceCard />
    </div>
  </UContainer>
</template>

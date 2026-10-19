<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { Form, Link } from '@adonisjs/inertia/vue'
import { t } from '~/utils/store'

defineProps<{ action: string; alreadyUnsubscribed: boolean }>()
</script>
<template>
  <Head :title="t('account.cartReminders.unsubscribe.title')" />
  <UContainer class="py-12 lg:py-20">
    <UPageCard
      variant="subtle"
      class="mx-auto max-w-md"
      :title="t('account.cartReminders.unsubscribe.title')"
      :description="
        alreadyUnsubscribed
          ? t('account.cartReminders.unsubscribe.already')
          : t('account.cartReminders.unsubscribe.description')
      "
    >
      <Link v-if="alreadyUnsubscribed" route="home">
        <UButton :label="t('account.cartReminders.unsubscribe.home')" variant="soft" />
      </Link>
      <Form v-else v-slot="{ processing }" :action="{ url: action, method: 'post' }">
        <UButton
          type="submit"
          :label="t('account.cartReminders.unsubscribe.action')"
          :loading="processing"
          :disabled="processing"
        />
      </Form>
    </UPageCard>
  </UContainer>
</template>

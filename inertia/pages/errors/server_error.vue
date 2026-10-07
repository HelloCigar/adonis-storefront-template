<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { urlFor } from '~/client'
import MarketingLayout from '~/layouts/marketing.vue'
</script>

<template>
  <Head title="Server error" />

  <MarketingLayout>
    <!-- Nuxt UI's default clear action calls Nuxt's clearError, which is a no-op under Inertia. -->
    <UError
      :error="{
        statusCode: 500,
        statusMessage: 'Something broke',
        message: 'Try again in a moment. If the problem persists, contact the store.',
      }"
      :clear="false"
      :ui="{ statusCode: 'text-error' }"
      class="min-h-dvh px-6"
    >
      <template #links>
        <UButton :to="urlFor('home')" label="Back to home" size="lg" />
      </template>
    </UError>
  </MarketingLayout>
</template>

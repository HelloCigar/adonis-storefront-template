<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { urlFor } from '~/client'
import MarketingLayout from '~/layouts/marketing.vue'
</script>

<template>
  <Head title="Page not found" />

  <MarketingLayout>
    <!-- Nuxt UI's default clear action calls Nuxt's clearError, which is a no-op under Inertia. -->
    <UError
      :error="{
        statusCode: 404,
        statusMessage: 'Page not found',
        message: 'The page you tried to reach doesn\'t exist. Check the URL or head back home.',
      }"
      :clear="false"
      class="min-h-dvh px-6"
    >
      <template #links>
        <UButton :to="urlFor('home')" label="Back to home" size="lg" />
      </template>
    </UError>
  </MarketingLayout>
</template>

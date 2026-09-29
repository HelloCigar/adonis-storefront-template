<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import MarketingLayout from '~/layouts/marketing.vue'
</script>

<template>
  <Head title="Page not found" />

  <MarketingLayout>
    <div class="flex min-h-dvh flex-col items-center justify-center px-6 pt-26 pb-14">
      <UPageCard class="w-full max-w-xl">
        <div
          class="flex items-center gap-2 text-xs font-medium tracking-wide text-dimmed uppercase"
        >
          <span class="size-1.5 rounded-full bg-current" />
          404
        </div>
        <h1 class="mt-6 text-3xl font-semibold text-highlighted">Not found.</h1>
        <p class="mt-4 text-sm text-pretty text-muted">
          The page you tried to reach doesn't exist. Check the URL or head back home.
        </p>
      </UPageCard>
    </div>
  </MarketingLayout>
</template>

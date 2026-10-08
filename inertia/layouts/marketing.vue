<script setup lang="ts">
import { urlFor } from '~/client'
import { usePage } from '@inertiajs/vue3'
import Logo from '~/components/logo.vue'
import FlashToasts from '~/components/flash_toasts.vue'
import ThemeToggle from '~/components/theme_toggle.vue'

const page = usePage()
</script>

<template>
  <div class="min-h-dvh bg-default text-default">
    <header class="absolute inset-x-0 top-0 z-10">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Logo :size="28" />
        <div class="flex items-center gap-2">
          <ThemeToggle />
          <template v-if="page.props.user">
            <UButton :to="urlFor('dashboard')" label="Dashboard" size="sm" />
          </template>
          <template v-else>
            <UButton
              :to="urlFor('session.create')"
              label="Sign in"
              color="neutral"
              variant="ghost"
              size="sm"
            />
            <UButton :to="urlFor('new_account.create')" label="Get started" size="sm" />
          </template>
        </div>
      </div>
    </header>

    <slot />
    <FlashToasts />
  </div>
</template>

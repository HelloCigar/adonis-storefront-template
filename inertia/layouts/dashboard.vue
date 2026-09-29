<script setup lang="ts">
import Logo from '~/components/logo.vue'
import { Form, Link } from '@adonisjs/inertia/vue'
import FlashToasts from '~/components/flash_toasts.vue'
import ThemeToggle from '~/components/theme_toggle.vue'
</script>

<template>
  <div class="min-h-dvh bg-default text-default">
    <header class="flex h-15 items-center border-b border-default bg-default px-8">
      <Logo :size="28" />
      <div class="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <Form route="session.destroy">
          <UButton
            type="submit"
            label="Log out"
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-log-out"
          />
        </Form>
      </div>
    </header>

    <nav class="flex h-12 items-center border-b border-default bg-default px-8">
      <Link
        route="dashboard"
        class="inline-flex items-center gap-1.5 text-sm font-medium text-highlighted"
      >
        <UIcon name="i-lucide-house" class="size-4" />
        Dashboard
      </Link>
    </nav>

    <main class="flex min-h-[calc(100dvh-108px)] bg-muted">
      <slot />
    </main>

    <FlashToasts />
  </div>
</template>

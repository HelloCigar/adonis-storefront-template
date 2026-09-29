<script setup lang="ts">
import Logo from '~/components/logo.vue'
import FlashToasts from '~/components/flash_toasts.vue'
import ThemeToggle from '~/components/theme_toggle.vue'
</script>

<template>
  <div class="grid min-h-dvh bg-default text-default lg:grid-cols-2">
    <div class="relative flex flex-col bg-default px-9 py-8">
      <Logo :size="28" />
      <div class="mx-auto my-auto w-full max-w-sm py-5">
        <slot />
      </div>
    </div>

    <aside
      class="relative hidden flex-col justify-between border-l border-default bg-muted p-11 lg:flex"
    >
      <div class="flex items-center justify-end">
        <ThemeToggle />
      </div>

      <p class="max-w-[22ch] text-2xl text-pretty text-highlighted">
        Auth, kept intentionally minimal so you can build it your way.
      </p>

      <div>
        <div class="mb-1 font-medium text-highlighted">Looking for production-ready auth?</div>
        <p class="max-w-[36ch] text-sm text-muted">
          Check out Kit components, production-ready full-stack components from the creator of
          AdonisJS.
        </p>
        <ULink
          to="https://plus.adonisjs.com/kit"
          target="_blank"
          class="mt-3.5 inline-block text-sm text-primary"
        >
          Explore Kit components →
        </ULink>
      </div>
    </aside>

    <FlashToasts />
  </div>
</template>

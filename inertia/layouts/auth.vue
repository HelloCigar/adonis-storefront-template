<script setup lang="ts">
import { Link } from '@adonisjs/inertia/vue'
import FlashToasts from '~/components/flash_toasts.vue'
import ThemeToggle from '~/components/theme_toggle.vue'
</script>

<template>
  <div class="grid min-h-dvh bg-default text-default lg:grid-cols-2">
    <div class="flex flex-col bg-default px-6 py-6 sm:px-10 sm:py-8">
      <header class="flex items-center justify-between gap-4">
        <Link
          route="home"
          aria-label="Your store — back to shopping"
          class="inline-flex items-center gap-2.5 text-lg font-semibold text-highlighted rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          <UIcon name="i-lucide-shopping-bag" class="size-6 text-primary" />
          Your store
        </Link>
        <ThemeToggle />
      </header>
      <main class="mx-auto my-auto w-full max-w-sm py-10 sm:py-12">
        <slot />
      </main>
      <p class="text-center text-sm text-muted">
        Just browsing?
        <Link route="home" class="font-medium text-highlighted underline underline-offset-4">
          Back to shopping
        </Link>
      </p>
    </div>

    <aside
      aria-labelledby="account-benefits-title"
      class="hidden flex-col justify-center border-l border-default bg-muted px-12 py-16 lg:flex xl:px-16"
    >
      <div class="mx-auto w-full max-w-sm">
        <h2
          id="account-benefits-title"
          class="text-3xl xl:text-4xl font-semibold text-highlighted text-balance"
        >
          Your orders and addresses, in one place.
        </h2>
        <p class="mt-4 text-default text-pretty leading-relaxed">
          Follow your purchases and keep your delivery details ready for next time.
        </p>
        <dl class="mt-10 space-y-6 border-t border-default pt-8">
          <div>
            <dt class="flex items-center gap-2 text-sm font-semibold text-highlighted">
              <UIcon name="i-lucide-package" class="size-4" />
              Order history
            </dt>
            <dd class="mt-1.5 text-sm text-default leading-relaxed">
              See your past orders and shipment details.
            </dd>
          </div>
          <div>
            <dt class="flex items-center gap-2 text-sm font-semibold text-highlighted">
              <UIcon name="i-lucide-map-pin" class="size-4" />
              Saved addresses
            </dt>
            <dd class="mt-1.5 text-sm text-default leading-relaxed">
              Keep delivery addresses handy for your next checkout.
            </dd>
          </div>
        </dl>
        <p class="mt-10 text-sm text-muted">You can also shop and check out without an account.</p>
      </div>
    </aside>

    <FlashToasts />
  </div>
</template>

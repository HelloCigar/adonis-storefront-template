<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import MarketingLayout from '~/layouts/marketing.vue'

const links = [
  {
    title: 'Documentation',
    description: 'Guides & API reference',
    href: 'https://docs.adonisjs.com',
  },
  {
    title: 'AdonisJS Plus',
    description: 'Production components',
    href: 'https://plus.adonisjs.com',
  },
  {
    title: 'Adocasts',
    description: 'Screencasts & lessons',
    href: 'https://adocasts.com',
  },
]
</script>

<template>
  <Head title="Homepage" />

  <MarketingLayout>
    <div class="flex min-h-dvh flex-col items-center justify-center px-6 pt-26 pb-14">
      <UPageCard class="w-full max-w-xl">
        <div
          class="flex items-center gap-2 text-xs font-medium tracking-wide text-success uppercase"
        >
          <span class="size-1.5 rounded-full bg-success" />
          Server ready
        </div>

        <h1 class="mt-6 text-3xl font-semibold text-balance text-highlighted">
          Welcome to the power of a full-stack Vue app.
        </h1>

        <p class="mt-4 text-sm text-pretty text-muted">
          Powered by Inertia, Vue, and Nuxt UI, this setup blends server-driven routing with rich
          client-side interactivity that feels seamless, fast, and cohesive.
        </p>

        <p class="mt-3 text-sm text-pretty text-muted">
          This page is simply proof the engine started. Everything from here is yours to build.
        </p>

        <div class="mt-6 divide-y divide-default border-y border-default">
          <ULink
            v-for="link in links"
            :key="link.href"
            :to="link.href"
            target="_blank"
            class="group flex items-center gap-3 py-3.5 text-highlighted"
          >
            <span class="size-1.5 rounded-xs bg-inverted" />
            <span class="font-medium">{{ link.title }}</span>
            <span class="text-sm text-muted">{{ link.description }}</span>
            <UIcon
              name="i-lucide-arrow-up-right"
              class="ml-auto size-4 text-dimmed transition group-hover:translate-x-0.5 group-hover:text-highlighted"
            />
          </ULink>
        </div>
      </UPageCard>
    </div>
  </MarketingLayout>
</template>

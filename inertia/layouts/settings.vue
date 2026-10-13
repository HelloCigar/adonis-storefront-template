<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { urlFor } from '~/client'
import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'

const page = usePage()

const links = computed(
  () =>
    [
      {
        label: 'General',
        icon: 'i-lucide-user',
        to: urlFor('settings'),
        exact: true,
      },
      {
        label: 'Security',
        icon: 'i-lucide-shield',
        to: urlFor('settings.security'),
      },
      ...(page.props.permissions.manageStoreSettings
        ? [
            {
              label: 'Store',
              icon: 'i-lucide-store',
              to: urlFor('settings.store.edit'),
              exact: true,
            },
            {
              label: 'Policies',
              icon: 'i-lucide-scroll-text',
              to: urlFor('settings.store_policies.edit'),
            },
          ]
        : []),
    ] satisfies NavigationMenuItem[]
)
</script>

<template>
  <UContainer v-if="!page.props.permissions.manageStore" class="py-8 sm:py-12">
    <div class="max-w-2xl mx-auto space-y-6">
      <h1 class="text-2xl font-semibold text-highlighted">Account settings</h1>
      <UNavigationMenu :items="links" highlight />
      <slot />
    </div>
  </UContainer>
  <UDashboardPanel v-else id="settings" :ui="{ body: 'lg:py-12' }">
    <template #header>
      <UDashboardNavbar title="Settings">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <!-- NOTE: The `-mx-1` class is used to align with the `DashboardSidebarCollapse` button here. -->
        <UNavigationMenu :items="links" highlight class="-mx-1 flex-1" />
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-2xl mx-auto">
        <slot />
      </div>
    </template>
  </UDashboardPanel>
</template>

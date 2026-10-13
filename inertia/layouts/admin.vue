<script setup lang="ts">
import { computed, ref } from 'vue'
import type { NavigationMenuItem } from '@nuxt/ui'
import { urlFor } from '~/client'
import { usePage } from '@inertiajs/vue3'
import FlashToasts from '~/components/flash_toasts.vue'
import PasskeySignals from '~/components/passkey_signals.vue'
import StorefrontLayout from '~/layouts/default.vue'
import { useDashboard } from '~/composables/useDashboard'

const open = ref(false)

const page = usePage()

type SidebarItem = {
  label: string
  icon: string
  to: string
  exact?: boolean
  onSelect?: () => void
}

type SidebarSection = { id: string; label?: string; icon?: string; items: SidebarItem[] }

function closeSidebar() {
  open.value = false
}

/**
 * Sidebar sections, ordered by how often staff reach for them: daily order work first, then the
 * catalog, marketing, store administration, and personal settings. Every section except the daily
 * links renders as a collapsible group that starts open.
 */
const sections = computed(() => {
  const { manageStore, manageUsers } = page.props.permissions

  const all: SidebarSection[] = [
    {
      id: 'daily',
      items: [
        { label: 'Home', icon: 'i-lucide-house', to: urlFor('dashboard') },
        ...(manageStore
          ? [{ label: 'Orders', icon: 'i-lucide-shopping-bag', to: urlFor('seller.orders.index') }]
          : []),
        { label: 'Inbox', icon: 'i-lucide-inbox', to: urlFor('inbox') },
      ],
    },
    {
      id: 'catalog',
      label: 'Catalog',
      icon: 'i-lucide-boxes',
      items: manageStore
        ? [
            { label: 'Products', icon: 'i-lucide-package', to: urlFor('seller.products.index') },
            {
              label: 'Collections',
              icon: 'i-lucide-folders',
              to: urlFor('seller.collections.index'),
            },
            { label: 'Reviews', icon: 'i-lucide-star', to: urlFor('seller.reviews.index') },
          ]
        : [],
    },
    {
      id: 'marketing',
      label: 'Marketing',
      icon: 'i-lucide-megaphone',
      items: manageStore
        ? [
            {
              label: 'Discounts',
              icon: 'i-lucide-ticket-percent',
              to: urlFor('seller.discounts.index'),
            },
            { label: 'Blog', icon: 'i-lucide-newspaper', to: urlFor('seller.posts.index') },
          ]
        : [],
    },
    {
      id: 'store',
      label: 'Store',
      icon: 'i-lucide-sliders-horizontal',
      items: [
        ...(manageStore
          ? [{ label: 'Emails', icon: 'i-lucide-mail', to: urlFor('seller.emails.index') }]
          : []),
        ...(manageUsers
          ? [{ label: 'Users', icon: 'i-lucide-users', to: urlFor('seller.users.index') }]
          : []),
      ],
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'i-lucide-settings',
      items: [
        { label: 'General', icon: 'i-lucide-user', to: urlFor('settings'), exact: true },
        { label: 'Security', icon: 'i-lucide-shield', to: urlFor('settings.security') },
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
      ],
    },
  ]

  return all
    .filter((section) => section.items.length > 0)
    .map((section) => ({
      ...section,
      items: section.items.map((item) => ({ ...item, onSelect: closeSidebar })),
    }))
})

const links = computed<NavigationMenuItem[]>(() =>
  sections.value.flatMap<NavigationMenuItem>((section) =>
    section.label
      ? [
          {
            label: section.label,
            icon: section.icon,
            type: 'trigger',
            defaultOpen: true,
            children: section.items,
          },
        ]
      : section.items
  )
)

const groups = computed(() =>
  sections.value.map((section) => ({
    id: section.id,
    label: section.label ?? 'Go to',
    items: section.items,
  }))
)

// Staff keyboard shortcuts (g-h, g-i, g-u, g-s) for the store dashboard.
if (page.props.permissions.manageStore) useDashboard()
</script>

<template>
  <StorefrontLayout v-if="!page.props.permissions.manageStore">
    <slot />
    <FlashToasts />
  </StorefrontLayout>
  <UDashboardGroup v-else unit="rem" storage="local">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <UButton
          :label="collapsed ? undefined : 'Store management'"
          :to="urlFor('dashboard')"
          icon="i-lucide-store"
          color="neutral"
          variant="ghost"
          :square="collapsed"
          :aria-label="collapsed ? 'Store management' : undefined"
          block
        />
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links"
          orientation="vertical"
          tooltip
          popover
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <slot />

    <FlashToasts />
    <PasskeySignals />
  </UDashboardGroup>
</template>

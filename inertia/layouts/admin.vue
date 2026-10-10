<script setup lang="ts">
import { computed, ref } from 'vue'
import { useStorage } from '@vueuse/core'
import type { NavigationMenuItem } from '@nuxt/ui'
import { urlFor } from '~/client'
import { usePage } from '@inertiajs/vue3'
import FlashToasts from '~/components/flash_toasts.vue'
import StorefrontLayout from '~/layouts/default.vue'

const toast = useToast()

const open = ref(false)

const page = usePage()

type SidebarItem = {
  label: string
  icon?: string
  to: string
  exact?: boolean
  defaultOpen?: boolean
  type?: 'trigger'
  children?: SidebarItem[]
  onSelect?: () => void
}

type SidebarSection = { id: string; label?: string; items: SidebarItem[] }

function closeSidebar() {
  open.value = false
}

/**
 * Sidebar sections, ordered by how often staff reach for them: daily order work first, then the
 * catalog, marketing, store administration, and personal account settings.
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
      id: 'account',
      label: 'Account',
      items: [
        {
          label: 'Settings',
          to: urlFor('settings'),
          icon: 'i-lucide-settings',
          defaultOpen: true,
          type: 'trigger',
          children: [
            { label: 'General', to: urlFor('settings'), exact: true },
            { label: 'Notifications', to: urlFor('settings.notifications') },
            { label: 'Security', to: urlFor('settings.security') },
          ],
        },
      ],
    },
  ]

  return all.filter((section) => section.items.length > 0)
})

function withClose(item: SidebarItem): SidebarItem {
  return item.children
    ? { ...item, children: item.children.map(withClose) }
    : { ...item, onSelect: closeSidebar }
}

const links = computed<NavigationMenuItem[][]>(() =>
  sections.value.map((section) => [
    ...(section.label ? [{ label: section.label, type: 'label' as const }] : []),
    ...section.items.map(withClose),
  ])
)

const groups = computed(() =>
  sections.value.map((section) => ({
    id: section.id,
    label: section.label ?? 'Go to',
    items: section.items.map(withClose),
  }))
)

const cookie = useStorage('cookie-consent', 'pending')
if (page.props.permissions.manageStore && cookie.value !== 'accepted') {
  toast.add({
    title: 'We use first-party cookies to enhance your experience on our website.',
    duration: 0,
    close: false,
    actions: [
      {
        label: 'Accept',
        color: 'neutral',
        variant: 'outline',
        onClick: () => {
          cookie.value = 'accepted'
        },
      },
      {
        label: 'Opt out',
        color: 'neutral',
        variant: 'ghost',
      },
    ],
  })
}
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

    <NotificationsSlideover />
    <FlashToasts />
  </UDashboardGroup>
</template>

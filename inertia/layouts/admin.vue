<script setup lang="ts">
import { computed, ref } from 'vue'
import { useStorage } from '@vueuse/core'
import type { NavigationMenuItem } from '@nuxt/ui'
import { urlFor } from '~/client'
import { usePage } from '@inertiajs/vue3'
import FlashToasts from '~/components/flash_toasts.vue'

const toast = useToast()

const open = ref(false)

const page = usePage()
const links = computed(
  () =>
    [
      [
        {
          label: 'Home',
          icon: 'i-lucide-house',
          to: urlFor('dashboard'),
          onSelect: () => {
            open.value = false
          },
        },
        {
          label: 'Inbox',
          icon: 'i-lucide-inbox',
          to: urlFor('inbox'),
          badge: '4',
          onSelect: () => {
            open.value = false
          },
        },
        ...(page.props.user?.role === 'seller'
          ? [
              {
                label: 'Products',
                icon: 'i-lucide-package',
                to: urlFor('seller.products.index'),
                onSelect: () => {
                  open.value = false
                },
              },
              {
                label: 'Collections',
                icon: 'i-lucide-folders',
                to: urlFor('seller.collections.index'),
                onSelect: () => {
                  open.value = false
                },
              },
              {
                label: 'Orders',
                icon: 'i-lucide-shopping-bag',
                to: urlFor('seller.orders.index'),
                onSelect: () => {
                  open.value = false
                },
              },
              {
                label: 'Users',
                icon: 'i-lucide-users',
                to: urlFor('seller.users.index'),
                onSelect: () => {
                  open.value = false
                },
              },
            ]
          : []),
        {
          label: 'Settings',
          to: urlFor('settings'),
          icon: 'i-lucide-settings',
          defaultOpen: true,
          type: 'trigger',
          children: [
            {
              label: 'General',
              to: urlFor('settings'),
              exact: true,
              onSelect: () => {
                open.value = false
              },
            },
            {
              label: 'Members',
              to: urlFor('settings.members'),
              onSelect: () => {
                open.value = false
              },
            },
            {
              label: 'Notifications',
              to: urlFor('settings.notifications'),
              onSelect: () => {
                open.value = false
              },
            },
            {
              label: 'Security',
              to: urlFor('settings.security'),
              onSelect: () => {
                open.value = false
              },
            },
          ],
        },
      ],
      [
        {
          label: 'Feedback',
          icon: 'i-lucide-message-circle',
          to: 'https://github.com/nuxt-ui-templates/dashboard-vue',
          target: '_blank',
        },
        {
          label: 'Help & Support',
          icon: 'i-lucide-info',
          to: 'https://github.com/nuxt/ui',
          target: '_blank',
        },
      ],
    ] satisfies NavigationMenuItem[][]
)

const groups = computed(() => [
  {
    id: 'links',
    label: 'Go to',
    items: links.value.flat(),
  },
  {
    id: 'code',
    label: 'Code',
    items: [
      {
        id: 'source',
        label: 'View page source',
        icon: 'simple-icons:github',
        target: '_blank',
      },
    ],
  },
])

const cookie = useStorage('cookie-consent', 'pending')
if (cookie.value !== 'accepted') {
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
  <UDashboardGroup unit="rem" storage="local">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <TeamsMenu :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[1]"
          orientation="vertical"
          tooltip
          class="mt-auto"
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

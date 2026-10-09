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
          onSelect: () => {
            open.value = false
          },
        },
        ...(page.props.permissions.manageStore
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
                label: 'Discounts',
                icon: 'i-lucide-ticket-percent',
                to: urlFor('seller.discounts.index'),
                onSelect: () => {
                  open.value = false
                },
              },
              {
                label: 'Reviews',
                icon: 'i-lucide-star',
                to: urlFor('seller.reviews.index'),
                onSelect: () => {
                  open.value = false
                },
              },
              {
                label: 'Blog',
                icon: 'i-lucide-newspaper',
                to: urlFor('seller.posts.index'),
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
                label: 'Emails',
                icon: 'i-lucide-mail',
                to: urlFor('seller.emails.index'),
                onSelect: () => {
                  open.value = false
                },
              },
            ]
          : []),
        ...(page.props.permissions.manageUsers
          ? [
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
    ] satisfies NavigationMenuItem[][]
)

const groups = computed(() => [
  {
    id: 'links',
    label: 'Go to',
    items: links.value.flat(),
  },
])

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
          :items="links[0]"
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

<script setup lang="ts">
import { computed } from 'vue'
import type { DropdownMenuItem } from '@nuxt/ui'
import { urlFor } from '~/client'
import { usePage } from '@inertiajs/vue3'
import { useRouter } from '@adonisjs/inertia/vue'

defineProps<{
  collapsed?: boolean
}>()

const page = usePage()
const router = useRouter()
const user = computed(() => {
  const name = page.props.user?.fullName ?? page.props.user?.email ?? 'Account'

  return {
    name,
    avatar: {
      src: page.props.user?.avatarUrl ?? undefined,
      text: page.props.user?.initials ?? 'A',
      alt: name,
    },
  }
})

const items = computed<DropdownMenuItem[][]>(() => [
  [
    {
      type: 'label',
      label: user.value.name,
      avatar: user.value.avatar,
    },
  ],
  [
    {
      label: 'Profile',
      icon: 'i-lucide-user',
      to: urlFor('settings'),
    },
    {
      label: 'Settings',
      icon: 'i-lucide-settings',
      to: urlFor('settings'),
    },
  ],
  [
    {
      label: 'Log out',
      icon: 'i-lucide-log-out',
      onSelect: () => router.post({ route: 'session.destroy' }),
    },
  ],
])
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      v-bind="{
        ...user,
        label: collapsed ? undefined : user?.name,
        trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down',
      }"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :ui="{
        trailingIcon: 'text-dimmed',
      }"
    />
  </UDropdownMenu>
</template>

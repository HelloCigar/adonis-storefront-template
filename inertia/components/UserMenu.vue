<script setup lang="ts">
import { computed } from 'vue'
import type { DropdownMenuItem } from '@nuxt/ui'
import { useColorMode } from '@vueuse/core'
import { useAppConfig } from '@nuxt/ui/runtime/vue/composables/useAppConfig.js'
import { urlFor } from '~/client'
import { usePage } from '@inertiajs/vue3'
import { useRouter } from '@adonisjs/inertia/vue'

defineProps<{
  collapsed?: boolean
}>()

const colorMode = useColorMode()
const page = usePage()
const router = useRouter()
const appConfig = useAppConfig() as {
  ui: { colors: { primary: string; neutral: string } }
}

const colors = [
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
]
const neutrals = ['slate', 'gray', 'zinc', 'neutral', 'stone', 'taupe', 'mauve', 'mist', 'olive']

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
      label: 'Theme',
      icon: 'i-lucide-palette',
      children: [
        {
          label: 'Primary',
          slot: 'chip',
          chip: appConfig.ui.colors.primary,
          content: {
            align: 'center',
            collisionPadding: 16,
          },
          children: colors.map((color) => ({
            label: color,
            chip: color,
            slot: 'chip',
            checked: appConfig.ui.colors.primary === color,
            type: 'checkbox',
            onSelect: (e) => {
              e.preventDefault()

              appConfig.ui.colors.primary = color
            },
          })),
        },
        {
          label: 'Neutral',
          slot: 'chip',
          chip:
            appConfig.ui.colors.neutral === 'neutral' ? 'old-neutral' : appConfig.ui.colors.neutral,
          content: {
            align: 'end',
            collisionPadding: 16,
          },
          children: neutrals.map((color) => ({
            label: color,
            chip: color === 'neutral' ? 'old-neutral' : color,
            slot: 'chip',
            type: 'checkbox',
            checked: appConfig.ui.colors.neutral === color,
            onSelect: (e) => {
              e.preventDefault()

              appConfig.ui.colors.neutral = color
            },
          })),
        },
      ],
    },
    {
      label: 'Appearance',
      icon: 'i-lucide-sun-moon',
      children: [
        {
          label: 'Light',
          icon: 'i-lucide-sun',
          type: 'checkbox',
          checked: colorMode.value === 'light',
          onSelect(e: Event) {
            e.preventDefault()

            colorMode.value = 'light'
          },
        },
        {
          label: 'Dark',
          icon: 'i-lucide-moon',
          type: 'checkbox',
          checked: colorMode.value === 'dark',
          onUpdateChecked(checked: boolean) {
            if (checked) {
              colorMode.value = 'dark'
            }
          },
          onSelect(e: Event) {
            e.preventDefault()
          },
        },
      ],
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

    <template #chip-leading="{ item }">
      <div class="inline-flex items-center justify-center shrink-0 size-5">
        <span
          class="rounded-full ring ring-bg bg-(--chip-light) dark:bg-(--chip-dark) size-2"
          :style="{
            '--chip-light': `var(--color-${(item as any).chip}-500)`,
            '--chip-dark': `var(--color-${(item as any).chip}-400)`,
          }"
        />
      </div>
    </template>
  </UDropdownMenu>
</template>

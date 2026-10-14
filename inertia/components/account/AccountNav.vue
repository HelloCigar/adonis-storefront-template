<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { usePage } from '@inertiajs/vue3'
import { computed } from 'vue'
import { urlFor } from '~/client'
import { t } from '~/utils/store'

withDefaults(defineProps<{ heading?: boolean }>(), { heading: true })

const page = usePage()
const name = computed(() => page.props.user?.firstName ?? page.props.user?.fullName ?? '')

const links = [
  {
    label: t('account.nav.overview'),
    icon: 'i-lucide-house',
    to: urlFor('account.show'),
    exact: true,
  },
  { label: t('account.nav.orders'), icon: 'i-lucide-package', to: urlFor('orders.index') },
  {
    label: t('account.nav.addresses'),
    icon: 'i-lucide-map-pin',
    to: urlFor('account.addresses.index'),
  },
  {
    label: t('account.nav.profile'),
    icon: 'i-lucide-user-round',
    to: urlFor('account.profile.show'),
  },
  {
    label: t('account.nav.security'),
    icon: 'i-lucide-shield',
    to: urlFor('account.security.show'),
  },
] satisfies NavigationMenuItem[]
</script>

<template>
  <div class="mb-8 lg:mb-10">
    <div v-if="heading" class="flex flex-wrap items-center justify-between gap-4 mb-6">
      <h1 class="text-4xl lg:text-5xl text-highlighted font-extrabold">
        {{ name ? t('account.greeting', { name }) : t('account.welcome') }}
      </h1>

      <UButton
        :to="urlFor('account.logout')"
        variant="outline"
        color="neutral"
        size="lg"
        :label="t('account.logout')"
        icon="i-lucide-log-out"
      />
    </div>

    <UNavigationMenu :items="links" highlight class="-mx-1 overflow-x-auto" />
  </div>
</template>

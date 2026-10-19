<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { urlFor } from '~/client'
import { t } from '~/utils/store'
const page = usePage()
const isLoggedIn = computed(() => !!page.props.user)
const open = ref(false)
const accountLinks = computed(() => [
  { label: t('account.menu.overview'), to: urlFor('account.show'), icon: 'i-lucide-house' },
  { label: t('account.menu.orders'), to: urlFor('orders.index'), icon: 'i-lucide-map-pin-house' },
  {
    label: t('account.menu.profile'),
    to: urlFor('account.profile.show'),
    icon: 'i-lucide-user-round',
  },
  {
    label: t('account.menu.security'),
    to: urlFor('account.security.show'),
    icon: 'i-lucide-shield',
  },
])
watch(
  () => page.url,
  () => {
    open.value = false
  }
)
</script>
<template>
  <UPopover v-model:open="open" :content="{ align: 'end', collisionPadding: 12 }">
    <UButton
      :icon="isLoggedIn ? 'i-lucide-user-round-check' : 'i-lucide-user-round'"
      variant="ghost"
      color="neutral"
      :label="t('account.label')"
      :ui="{
        label: 'sr-only',
        base: 'px-1.5 lg:px-2',
      }"
    />

    <template #content>
      <div v-if="!isLoggedIn" class="w-72 p-4">
        <p class="text-sm font-semibold text-highlighted">{{ t('account.menu.title') }}</p>
        <p class="mt-1 text-sm text-muted text-pretty">{{ t('account.signIn.description') }}</p>

        <UButton
          :to="urlFor('session.create')"
          :label="t('account.signIn.action')"
          block
          size="lg"
          class="mt-4 min-h-11 text-highlighted dark:text-inverted"
        />

        <p class="mt-4 text-center text-sm text-default">
          {{ t('account.signUp.prompt') }}
          <ULink
            :to="urlFor('new_account.create')"
            class="font-semibold text-highlighted underline underline-offset-4 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            {{ t('account.signUp.action') }}
          </ULink>
        </p>
      </div>

      <div v-else class="w-60 p-2">
        <p class="px-2.5 pt-1.5 pb-2 text-sm font-semibold text-highlighted">
          {{ t('account.menu.title') }}
        </p>

        <nav class="flex flex-col gap-0.5">
          <UButton
            v-for="link in accountLinks"
            :key="link.label"
            :to="link.to"
            :label="link.label"
            :icon="link.icon"
            variant="ghost"
            color="neutral"
            class="w-full"
          />
        </nav>

        <USeparator class="my-2" />

        <UButton
          :to="urlFor('account.logout')"
          variant="ghost"
          color="neutral"
          class="w-full"
          :label="t('account.logout')"
          icon="i-lucide-log-out"
        />
      </div>
    </template>
  </UPopover>
</template>

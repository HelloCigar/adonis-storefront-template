<script setup lang="ts">
import { computed } from 'vue'
import { t } from '~/utils/store'
import { useMenu } from '~/composables/menu'
import type { NavigationMenuItem } from '@nuxt/ui'
import AppLocaleSelect from '~/components/app/LocaleSelect.vue'
import AppVersion from '~/components/app/Version.vue'
const { data: policies } = useMenu('footer')
const toast = useToast()
const items = computed<NavigationMenuItem[]>(() =>
  [
    { to: 'https://github.com/nuxt/ui', label: t('footer.links.github') },
    { to: 'https://ui.nuxt.com', label: t('footer.links.module') },
    { to: 'https://docs.adonisjs.com', label: t('footer.links.documentation') },
    { to: 'https://www.npmjs.com/package/@nuxt/ui', label: t('footer.links.npm') },
  ].map((item) => ({ ...item, target: '_blank', icon: 'i-lucide-minus' }))
)
const showPreferences = () =>
  toast.add({ title: 'Cookies', description: 'This store uses essential session cookies only.' })
</script>
<template>
  <UFooter
    :ui="{
      root: 'border-t border-default',
      top: 'pb-0 lg:pb-0',
      bottom: 'border-t border-default',
      container: 'pb-6 lg:pb-10',
    }"
  >
    <template #top>
      <UContainer class="flex flex-col sm:flex-row sm:items-end">
        <AppVersion />

        <span class="hidden mx-4 mb-2 h-6 w-px bg-(--ui-border) sm:block sm:mb-4 sm:mx-6" />

        <UNavigationMenu
          :items="items"
          :ui="{
            root: 'sm:-mb-1 md:mb-1',
            list: 'flex items-start flex-col sm:flex-row',
            item: 'py-1 sm:py-2',
            linkLeadingIcon: 'sm:hidden',
            linkLabelExternalIcon: 'hidden',
          }"
        />
      </UContainer>
    </template>

    <template #left>
      <p class="mb-5 lg:mb-0 text-muted font-medium text-sm">
        {{ t('footer.message') }}
      </p>
    </template>

    <template #right>
      <UNavigationMenu
        orientation="horizontal"
        :items="[
          {
            icon: 'i-lucide-github',
            to: 'https://github.com/nuxt/ui',
            label: t('footer.github'),
            target: '_blank',
          },
        ]"
        :ui="{
          linkLabelExternalIcon: 'hidden',
        }"
      />

      <AppLocaleSelect>
        <UButton
          variant="link"
          color="neutral"
          icon="i-lucide-languages"
          :label="t('localization.title')"
          :ui="{
            base: 'hover:bg-elevated/50',
            leadingIcon: 'text-dimmed',
          }"
        />
      </AppLocaleSelect>
    </template>

    <template #bottom>
      <div class="flex justify-center px-12">
        <UNavigationMenu
          v-if="policies?.length"
          variant="pill"
          :items="[
            ...policies,
            {
              onSelect: () => showPreferences(),
              label: t('footer.cookies'),
            },
          ]"
          :ui="{
            list: 'flex-wrap justify-center lg:justify-end',
            link: 'text-dimmed text-xs',
          }"
        />
      </div>
    </template>
  </UFooter>
</template>

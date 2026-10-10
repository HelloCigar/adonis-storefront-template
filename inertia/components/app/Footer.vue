<script setup lang="ts">
import { computed } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { t } from '~/utils/store'
import { useMenu } from '~/composables/menu'
import AppLocaleSelect from '~/components/app/LocaleSelect.vue'
const { data: policies } = useMenu('footer')
const page = usePage()
const toast = useToast()
const copyright = computed(() =>
  t('footer.copyright', { year: new Date().getFullYear(), name: page.props.storeName })
)
const showPreferences = () =>
  toast.add({ title: 'Cookies', description: 'This store uses essential session cookies only.' })
</script>
<template>
  <UFooter
    :ui="{
      root: 'border-t border-default',
      bottom: 'border-t border-default',
      container: 'pb-6 lg:pb-10',
    }"
  >
    <template #left>
      <p class="mb-5 lg:mb-0 text-muted font-medium text-sm">
        {{ copyright }}
      </p>
    </template>

    <template #right>
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

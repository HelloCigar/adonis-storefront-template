<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { useRouter } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'

const props = defineProps<{ dashboardCopilot: Data.Settings.StoreSetting['dashboardCopilot'] }>()

const router = useRouter()
const page = usePage<{ errors: { dashboardCopilot?: { enabled?: string } } }>()
const saving = ref(false)
const error = computed(() => page.props.errors?.dashboardCopilot?.enabled)
const notSetUp = "AI isn't set up for this store yet."

/** Saves as soon as the switch changes; the confirmation arrives as the layout's flash toast. */
function save(enabled: boolean) {
  router.put(
    { route: 'settings.dashboard_copilot.update' },
    { enabled },
    {
      preserveScroll: true,
      errorBag: 'dashboardCopilot',
      onStart: () => (saving.value = true),
      onFinish: () => (saving.value = false),
    }
  )
}
</script>

<template>
  <UFormField
    name="enabled"
    :error="error"
    :help="props.dashboardCopilot.configured ? undefined : notSetUp"
  >
    <USwitch
      :model-value="props.dashboardCopilot.enabled"
      label="Copilot"
      description="Let staff and admins ask an AI copilot about orders, products, customers and sales, and confirm the changes it proposes."
      :disabled="saving || !props.dashboardCopilot.configured"
      @update:model-value="save"
    />
  </UFormField>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { useRouter } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'

const props = defineProps<{ shoppingAssistant: Data.Settings.StoreSetting['shoppingAssistant'] }>()

const router = useRouter()
const page = usePage<{ errors: { shoppingAssistant?: { enabled?: string } } }>()
const saving = ref(false)
const error = computed(() => page.props.errors?.shoppingAssistant?.enabled)
const notSetUp = "AI isn't set up for this store yet."

/** Saves as soon as the switch changes; the confirmation arrives as the layout's flash toast. */
function save(enabled: boolean) {
  router.put(
    { route: 'settings.shopping_assistant.update' },
    { enabled },
    {
      preserveScroll: true,
      errorBag: 'shoppingAssistant',
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
    :help="props.shoppingAssistant.configured ? undefined : notSetUp"
  >
    <USwitch
      :model-value="props.shoppingAssistant.enabled"
      label="Shopping assistant"
      description="Let shoppers ask an AI assistant about products, shipping, policies and their orders."
      :disabled="saving || !props.shoppingAssistant.configured"
      @update:model-value="save"
    />
  </UFormField>
</template>

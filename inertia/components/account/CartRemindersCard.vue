<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from '@adonisjs/inertia/vue'
import { t } from '~/utils/store'

const props = defineProps<{ enabled: boolean }>()
const router = useRouter()
// The switch follows the saved value again whenever the page props refresh.
const checked = ref(props.enabled)
watch(
  () => props.enabled,
  (enabled) => {
    checked.value = enabled
  }
)
const update = (enabled: boolean) =>
  router.put(
    { route: 'account.cart_reminders.update' },
    { enabled },
    {
      preserveScroll: true,
      onError: () => {
        checked.value = props.enabled
      },
    }
  )
</script>

<template>
  <section class="mt-8">
    <UPageCard
      :title="t('account.cartReminders.title')"
      :description="t('account.cartReminders.description')"
      variant="naked"
      class="mb-4"
    />
    <UPageCard variant="subtle">
      <USwitch
        v-model="checked"
        :label="t('account.cartReminders.switch')"
        @update:model-value="update"
      />
    </UPageCard>
  </section>
</template>

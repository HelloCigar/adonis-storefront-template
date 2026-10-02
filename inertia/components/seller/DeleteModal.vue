<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import { watch } from 'vue'
const props = defineProps<{ title: string; description: string; action: string }>()
const open = defineModel<boolean>('open', { required: true })
const form = useForm({})
watch(open, () => form.clearErrors())
function destroy() {
  form.delete(props.action, {
    preserveScroll: true,
    onSuccess: () => {
      open.value = false
    },
  })
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :description="description"
    :dismissible="!form.processing"
  >
    <template #body>
      <UAlert
        v-if="Object.values(form.errors).length"
        color="error"
        :title="Object.values(form.errors).join(' ')"
        class="mb-4"
      />
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="outline"
          :disabled="form.processing"
          @click="open = false"
        />
        <UButton
          label="Delete"
          color="error"
          :loading="form.processing"
          :disabled="form.processing"
          @click="destroy"
        />
      </div>
    </template>
  </UModal>
</template>

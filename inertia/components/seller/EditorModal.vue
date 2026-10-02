<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })
defineProps<{ title: string; description: string; processing: boolean }>()
const emit = defineEmits<{ submit: [] }>()
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :description="description"
    :dismissible="!processing"
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <form class="space-y-4" @submit.prevent="emit('submit')">
        <slot />
        <div class="flex justify-end gap-2 pt-4 border-t border-default">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            :disabled="processing"
            @click="open = false"
          />
          <UButton type="submit" label="Save" :loading="processing" :disabled="processing" />
        </div>
      </form>
    </template>
  </UModal>
</template>

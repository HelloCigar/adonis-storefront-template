<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import { urlFor } from '~/client'
const props = defineProps<{ review: Data.Catalog.Review }>()
const open = defineModel<boolean>('open', { required: true })
const form = useForm({})
function destroy() {
  form.delete(urlFor('reviews.destroy', { id: props.review.id }), {
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
    title="Delete your review?"
    description="Your review will be removed from this product. You can write a new one afterwards."
    :dismissible="!form.processing"
  >
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="outline"
          :disabled="form.processing"
          @click="open = false"
        />
        <UButton
          label="Delete review"
          color="error"
          :loading="form.processing"
          :disabled="form.processing"
          @click="destroy"
        />
      </div>
    </template>
  </UModal>
</template>

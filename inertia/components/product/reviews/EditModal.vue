<script setup lang="ts">
import { watch } from 'vue'
import { useForm } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import { urlFor } from '~/client'
const props = defineProps<{ productId: number; review?: Data.Catalog.Review | null }>()
const open = defineModel<boolean>('open', { required: true })
const ratings = [1, 2, 3, 4, 5].map((value) => ({
  label: value === 1 ? '1 star' : `${value} stars`,
  value: String(value),
}))
const form = useForm({
  rating: undefined as string | undefined,
  title: '',
  body: '',
})
watch(
  open,
  (isOpen) => {
    if (!isOpen) return
    form.clearErrors()
    form.rating = props.review ? String(props.review.rating) : undefined
    form.title = props.review?.title ?? ''
    form.body = props.review?.body ?? ''
  },
  { immediate: true }
)
function save() {
  form.transform((data) => ({
    rating: data.rating ? Number(data.rating) : null,
    title: data.title.trim() || null,
    body: data.body.trim() || null,
  }))
  const options = {
    preserveScroll: true,
    onSuccess: () => {
      open.value = false
    },
  }
  if (props.review) form.patch(urlFor('reviews.update', { id: props.review.id }), options)
  else form.post(urlFor('reviews.store', { productId: props.productId }), options)
}
</script>
<template>
  <UModal
    v-model:open="open"
    :title="review ? 'Edit your review' : 'Write a review'"
    description="Reviews appear once the store approves them."
    :dismissible="!form.processing"
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #body>
      <form class="space-y-4" @submit.prevent="save">
        <UFormField name="rating" label="Rating" :error="form.errors.rating" required>
          <URadioGroup
            v-model="form.rating"
            :items="ratings"
            orientation="horizontal"
            :ui="{ fieldset: 'flex-wrap gap-x-4 gap-y-2' }"
          />
        </UFormField>
        <UFormField name="title" label="Title" :error="form.errors.title">
          <UInput v-model="form.title" class="w-full" maxlength="120" />
        </UFormField>
        <UFormField name="body" label="Review" :error="form.errors.body">
          <UTextarea v-model="form.body" class="w-full" :rows="5" maxlength="2000" />
        </UFormField>

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            type="button"
            label="Cancel"
            color="neutral"
            variant="outline"
            :disabled="form.processing"
            @click="open = false"
          />
          <UButton
            type="submit"
            :label="review ? 'Save review' : 'Submit review'"
            :loading="form.processing"
            :disabled="form.processing"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>

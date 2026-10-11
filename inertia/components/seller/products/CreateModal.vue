<script setup lang="ts">
import { ref, watch } from 'vue'
import { useForm } from '@inertiajs/vue3'
import { urlFor } from '~/client'
const open = defineModel<boolean>('open', { required: true })
const form = useForm({
  title: '',
  handle: '',
  description: null as string | null,
  vendor: null as string | null,
  productType: null as string | null,
  status: 'draft',
})
// Keep the handle in step with the title until the user edits the handle themselves.
const handleEdited = ref(false)
const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
watch(
  open,
  (isOpen) => {
    if (!isOpen) return
    form.reset()
    form.clearErrors()
    handleEdited.value = false
  },
  { immediate: true }
)
watch(
  () => form.title,
  (title) => {
    if (!handleEdited.value) form.handle = slugify(title)
  }
)
function save() {
  form.post(urlFor('seller.products.store'), {
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
    title="Add product"
    description="Start with a name. You'll add images, options and variants on the next page."
    :dismissible="!form.processing"
  >
    <template #body>
      <form class="space-y-4" @submit.prevent="save">
        <UFormField name="title" label="Title" :error="form.errors.title" required
          ><UInput v-model="form.title" class="w-full" autofocus required
        /></UFormField>
        <UFormField
          name="handle"
          label="Handle"
          description="Used in the storefront URL, for example bunny-lamp."
          :error="form.errors.handle"
          required
          ><UInput v-model="form.handle" class="w-full" required @input="handleEdited = true"
        /></UFormField>
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
            label="Create product"
            :loading="form.processing"
            :disabled="form.processing"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>

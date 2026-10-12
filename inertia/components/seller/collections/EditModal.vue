<script setup lang="ts">
import { watch } from 'vue'
import { useForm } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import { urlFor } from '~/client'
const props = defineProps<{
  collection?: Data.Seller.Collection
  products: Data.Seller.Product[]
}>()
const open = defineModel<boolean>('open', { required: true })
const form = useForm({
  title: '',
  handle: '',
  description: '',
  published: false,
  productIds: [] as string[],
})
watch(
  open,
  (isOpen) => {
    if (!isOpen) return
    const collection = props.collection
    form.reset()
    form.clearErrors()
    if (collection)
      Object.assign(form, {
        title: collection.title,
        handle: collection.handle,
        description: collection.description || '',
        published: collection.published,
        productIds: [...collection.productIds],
      })
  },
  { immediate: true }
)
function save() {
  form.transform((data) => ({ ...data, description: data.description || null }))
  const options = {
    preserveScroll: true,
    onSuccess: () => {
      open.value = false
    },
  }
  if (props.collection)
    form.patch(urlFor('seller.collections.update', { id: props.collection.id }), options)
  else form.post(urlFor('seller.collections.store'), options)
}
</script>
<template>
  <UModal
    v-model:open="open"
    :title="collection ? 'Edit collection' : 'Add collection'"
    description="Choose products and decide when to publish the collection."
    :dismissible="!form.processing"
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <form class="space-y-4" @submit.prevent="save">
        <UFormField name="title" label="Title" :error="form.errors.title" required
          ><UInput v-model="form.title" class="w-full" required
        /></UFormField>
        <UFormField name="handle" label="Handle" :error="form.errors.handle" required
          ><UInput v-model="form.handle" class="w-full" required
        /></UFormField>
        <UFormField name="description" label="Description" :error="form.errors.description"
          ><UTextarea v-model="form.description" class="w-full" :rows="3"
        /></UFormField>
        <UFormField name="productIds" label="Products" :error="form.errors.productIds"
          ><USelectMenu
            v-model="form.productIds"
            :items="products.map((product) => ({ label: product.title, value: product.id }))"
            value-key="value"
            multiple
            class="w-full"
            placeholder="Choose products"
        /></UFormField>
        <UFormField name="published" :error="form.errors.published"
          ><USwitch v-model="form.published" label="Publish in storefront"
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
            label="Save"
            :loading="form.processing"
            :disabled="form.processing"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>

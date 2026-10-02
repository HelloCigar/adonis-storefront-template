<script setup lang="ts">
import { watch } from 'vue'
import { useForm } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import { urlFor } from '~/client'
const props = defineProps<{ product?: Data.Seller.Product }>()
const open = defineModel<boolean>('open', { required: true })
const form = useForm({
  title: '',
  handle: '',
  description: '',
  vendor: '',
  productType: '',
  status: 'draft',
})
watch(
  open,
  (isOpen) => {
    if (!isOpen) return
    const product = props.product
    form.reset()
    form.clearErrors()
    if (product)
      Object.assign(form, {
        title: product.title,
        handle: product.handle,
        description: product.description || '',
        vendor: product.vendor || '',
        productType: product.productType || '',
        status: product.status,
      })
  },
  { immediate: true }
)
function save() {
  form.transform((data) => ({
    ...data,
    description: data.description || null,
    vendor: data.vendor || null,
    productType: data.productType || null,
  }))
  const options = {
    preserveScroll: true,
    onSuccess: () => {
      open.value = false
    },
  }
  if (props.product) form.patch(urlFor('seller.products.update', { id: props.product.id }), options)
  else form.post(urlFor('seller.products.store'), options)
}
</script>
<template>
  <UModal
    v-model:open="open"
    :title="product ? 'Edit product' : 'Add product'"
    description="Add the essentials, then manage pricing and stock in variants."
    :dismissible="!form.processing"
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <form class="space-y-4" @submit.prevent="save">
        <UFormField name="title" label="Title" :error="form.errors.title" required
          ><UInput v-model="form.title" class="w-full" required
        /></UFormField>
        <UFormField
          name="handle"
          label="Handle"
          description="Used in the storefront URL, for example bunny-lamp."
          :error="form.errors.handle"
          required
          ><UInput v-model="form.handle" class="w-full" required
        /></UFormField>
        <UFormField name="description" label="Description" :error="form.errors.description"
          ><UTextarea v-model="form.description" class="w-full" :rows="4"
        /></UFormField>
        <div class="grid sm:grid-cols-2 gap-4">
          <UFormField name="vendor" label="Vendor" :error="form.errors.vendor"
            ><UInput v-model="form.vendor" class="w-full"
          /></UFormField>
          <UFormField name="productType" label="Product type" :error="form.errors.productType"
            ><UInput v-model="form.productType" class="w-full"
          /></UFormField>
        </div>
        <UFormField
          name="status"
          label="Status"
          description="Active products appear in the storefront once they have a variant."
          :error="form.errors.status"
          ><USelect v-model="form.status" :items="['draft', 'active', 'archived']" class="w-full"
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

<script setup lang="ts">
import { watch } from 'vue'
import { useForm } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import { urlFor } from '~/client'
import { statusOptions } from '~/utils/status'
const props = defineProps<{ product: Data.Seller.Product }>()
function values(product: Data.Seller.Product) {
  return {
    title: product.title,
    handle: product.handle,
    description: product.description || '',
    vendor: product.vendor || '',
    productType: product.productType || '',
    status: product.status as string,
  }
}
const form = useForm(values(props.product))
// After a save (or any other visit) compare against the new server state. Moving only the
// defaults keeps unsaved edits intact when an unrelated section changes the product props.
watch(
  () => props.product,
  (product) => form.defaults(values(product))
)
function save() {
  form.transform((data) => ({
    ...data,
    description: data.description || null,
    vendor: data.vendor || null,
    productType: data.productType || null,
  }))
  form.patch(urlFor('seller.products.update', { id: props.product.id }), { preserveScroll: true })
}
function discard() {
  form.reset()
  form.clearErrors()
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="save">
    <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <UCard>
        <div class="space-y-4">
          <UFormField name="title" label="Title" :error="form.errors.title" required>
            <UInput v-model="form.title" class="w-full" required />
          </UFormField>
          <UFormField name="description" label="Description" :error="form.errors.description">
            <UTextarea v-model="form.description" class="w-full" :rows="6" />
          </UFormField>
          <UFormField
            name="handle"
            label="Handle"
            :error="form.errors.handle"
            required
            :help="`Storefront page: /product/${form.handle || 'your-handle'}`"
          >
            <UInput v-model="form.handle" class="w-full" required />
          </UFormField>
        </div>
      </UCard>

      <div class="space-y-4">
        <UCard>
          <UFormField
            name="status"
            label="Status"
            description="Active products appear in the storefront once they have a variant."
            :error="form.errors.status"
          >
            <USelect v-model="form.status" :items="statusOptions('product')" class="w-full" />
          </UFormField>
        </UCard>
        <UCard>
          <div class="space-y-4">
            <UFormField name="vendor" label="Vendor" :error="form.errors.vendor">
              <UInput v-model="form.vendor" class="w-full" />
            </UFormField>
            <UFormField name="productType" label="Product type" :error="form.errors.productType">
              <UInput v-model="form.productType" class="w-full" />
            </UFormField>
          </div>
        </UCard>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-end gap-3">
      <p v-if="form.isDirty" class="text-sm text-muted" role="status">Unsaved changes</p>
      <UButton
        v-if="form.isDirty"
        type="button"
        label="Discard"
        color="neutral"
        variant="outline"
        :disabled="form.processing"
        @click="discard"
      />
      <UButton
        type="submit"
        label="Save"
        class="text-highlighted dark:text-inverted"
        :loading="form.processing"
        :disabled="!form.isDirty || form.processing"
      />
    </div>
  </form>
</template>

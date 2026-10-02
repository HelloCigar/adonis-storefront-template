<script setup lang="ts">
import { h, ref, resolveComponent } from 'vue'
import { Head, useForm } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import type { TableColumn } from '@nuxt/ui'
import { urlFor } from '~/client'
import ResourceTable from '~/components/seller/ResourceTable.vue'
import EditorModal from '~/components/seller/EditorModal.vue'
import DeleteModal from '~/components/seller/DeleteModal.vue'
defineProps<{ collections: Data.Seller.Collection[]; products: Data.Seller.Product[] }>()
const badge = resolveComponent('UBadge')
const columns: TableColumn<Data.Seller.Collection>[] = [
  { accessorKey: 'title', header: 'Collection' },
  { accessorKey: 'handle', header: 'Handle' },
  { accessorKey: 'productCount', header: 'Products' },
  {
    accessorKey: 'published',
    header: 'Status',
    cell: ({ row }) =>
      h(badge, {
        label: row.original.published ? 'Published' : 'Draft',
        color: row.original.published ? 'success' : 'neutral',
        variant: 'subtle',
      }),
  },
]
const selected = ref<Data.Seller.Collection>()
const open = ref(false)
const deleting = ref(false)
function requestDelete(collection: Data.Seller.Collection) {
  selected.value = collection
  deleting.value = true
}
const form = useForm({
  title: '',
  handle: '',
  description: '',
  published: false,
  productIds: [] as number[],
})
function edit(collection?: Data.Seller.Collection) {
  selected.value = collection
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
  open.value = true
}
function save() {
  form.transform((data) => ({ ...data, description: data.description || null }))
  const options = {
    preserveScroll: true,
    onSuccess: () => {
      open.value = false
    },
  }
  if (selected.value)
    form.patch(urlFor('seller.collections.update', { id: selected.value.id }), options)
  else form.post(urlFor('seller.collections.store'), options)
}
</script>

<template>
  <Head title="Collections" />
  <ResourceTable
    title="Collections"
    singular="collection"
    description="Group products to help customers browse your store."
    :rows="collections"
    :columns="columns"
    :search-text="(collection) => `${collection.title} ${collection.handle}`"
    :status="(collection) => (collection.published ? 'published' : 'draft')"
    :filters="[
      { label: 'Published', value: 'published' },
      { label: 'Draft', value: 'draft' },
    ]"
    can-create
    can-edit
    :can-delete="() => true"
    @create="edit()"
    @edit="edit"
    @delete="requestDelete"
  >
    <EditorModal
      v-model:open="open"
      :title="selected ? 'Edit collection' : 'Add collection'"
      description="Choose products and decide when to publish the collection."
      :processing="form.processing"
      @submit="save"
    >
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
    </EditorModal>
    <DeleteModal
      v-if="selected"
      v-model:open="deleting"
      title="Delete collection?"
      :description="`Delete ${selected.title}? Its products will remain in your catalogue. This cannot be undone.`"
      :action="urlFor('seller.collections.destroy', { id: selected.id })"
    />
  </ResourceTable>
</template>

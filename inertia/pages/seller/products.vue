<script setup lang="ts">
import { h, ref, resolveComponent } from 'vue'
import { Head, router, useForm } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import type { TableColumn } from '@nuxt/ui'
import { urlFor } from '~/client'
import ResourceTable from '~/components/seller/ResourceTable.vue'
import EditorModal from '~/components/seller/EditorModal.vue'
import DeleteModal from '~/components/seller/DeleteModal.vue'

defineProps<{ products: Data.Seller.Product[] }>()
const badge = resolveComponent('UBadge')
const columns: TableColumn<Data.Seller.Product>[] = [
  {
    accessorKey: 'title',
    header: 'Product',
    cell: ({ row }) =>
      h('div', [
        h('p', { class: 'font-medium text-highlighted' }, row.original.title),
        h('p', { class: 'text-xs text-muted' }, row.original.handle),
      ]),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) =>
      h(badge, {
        label: row.original.status,
        variant: 'subtle',
        color: row.original.status === 'active' ? 'success' : 'neutral',
        class: 'capitalize',
      }),
  },
  { accessorKey: 'vendor', header: 'Vendor' },
  { accessorKey: 'productType', header: 'Type' },
  { id: 'variants', header: 'Variants', cell: ({ row }) => row.original.variants?.length || 0 },
  {
    id: 'stock',
    header: 'Stock',
    cell: ({ row }) =>
      row.original.variants?.some((variant) => variant.inventoryQuantity === null)
        ? 'Untracked'
        : row.original.variants?.reduce(
            (total, variant) => total + (variant.inventoryQuantity || 0),
            0
          ) || 0,
  },
]
const selected = ref<Data.Seller.Product>()
const open = ref(false)
const deleting = ref(false)
function requestDelete(product: Data.Seller.Product) {
  selected.value = product
  deleting.value = true
}
const form = useForm({
  title: '',
  handle: '',
  description: '',
  vendor: '',
  productType: '',
  status: 'draft',
})
function edit(product?: Data.Seller.Product) {
  selected.value = product
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
  open.value = true
}
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
  if (selected.value)
    form.patch(urlFor('seller.products.update', { id: selected.value.id }), options)
  else form.post(urlFor('seller.products.store'), options)
}
const searchText = (product: Data.Seller.Product) =>
  `${product.title} ${product.handle} ${product.vendor || ''} ${product.productType || ''}`
</script>

<template>
  <Head title="Products" />
  <ResourceTable
    title="Products"
    singular="product"
    description="Manage your catalogue, publishing status, and inventory."
    :rows="products"
    :columns="columns"
    :search-text="searchText"
    :status="(product) => product.status"
    :filters="
      ['draft', 'active', 'archived'].map((value) => ({
        label: value[0].toUpperCase() + value.slice(1),
        value,
      }))
    "
    can-create
    can-edit
    :can-delete="() => true"
    :actions="
      (product) => [
        {
          label: 'Manage variants',
          icon: 'i-lucide-boxes',
          onSelect: () => router.visit(urlFor('seller.variants.index', { productId: product.id })),
        },
        ...(product.status === 'active'
          ? [
              {
                label: 'View in storefront',
                icon: 'i-lucide-external-link',
                to: urlFor('products.show', { handle: product.handle }),
              },
            ]
          : []),
      ]
    "
    @create="edit()"
    @edit="edit"
    @delete="requestDelete"
  >
    <EditorModal
      v-model:open="open"
      :title="selected ? 'Edit product' : 'Add product'"
      description="Add the essentials, then manage pricing and stock in variants."
      :processing="form.processing"
      @submit="save"
    >
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
    </EditorModal>
    <DeleteModal
      v-if="selected"
      v-model:open="deleting"
      title="Delete product?"
      :description="`Delete ${selected.title} and its variants? Existing orders keep their purchase details. This cannot be undone.`"
      :action="urlFor('seller.products.destroy', { id: selected.id })"
    />
  </ResourceTable>
</template>

<script setup lang="ts">
import { h, ref, resolveComponent } from 'vue'
import { Head, useForm } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import type { TableColumn } from '@nuxt/ui'
import { urlFor } from '~/client'
import ResourceTable from '~/components/seller/ResourceTable.vue'
import EditorModal from '~/components/seller/EditorModal.vue'
import DeleteModal from '~/components/seller/DeleteModal.vue'
const props = defineProps<{ product: Data.Seller.Product; images: Data.Shared.Media[] }>()
const badge = resolveComponent('UBadge')
const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount)
const columns: TableColumn<Data.Seller.Variant>[] = [
  { accessorKey: 'title', header: 'Variant' },
  { accessorKey: 'sku', header: 'SKU' },
  {
    accessorKey: 'priceAmount',
    header: 'Price',
    cell: ({ row }) => money(row.original.priceAmount, row.original.currencyCode),
  },
  {
    accessorKey: 'inventoryQuantity',
    header: 'Stock',
    cell: ({ row }) => row.original.inventoryQuantity ?? 'Untracked',
  },
  {
    accessorKey: 'availableForSale',
    header: 'Availability',
    cell: ({ row }) =>
      h(badge, {
        label: row.original.availableForSale ? 'Available' : 'Unavailable',
        color: row.original.availableForSale ? 'success' : 'neutral',
        variant: 'subtle',
      }),
  },
  {
    id: 'options',
    header: 'Options',
    cell: ({ row }) =>
      Object.entries(row.original.options || {})
        .map(([name, value]) => `${name}: ${value}`)
        .join(' · ') || 'Default',
  },
]
const selected = ref<Data.Seller.Variant>()
const open = ref(false)
const deleting = ref(false)
const imagesOpen = ref(false)
const deletingImage = ref(false)
const selectedImage = ref<Data.Shared.Media>()
function requestDelete(variant: Data.Seller.Variant) {
  selected.value = variant
  deleting.value = true
}
function requestImageDelete(image: Data.Shared.Media) {
  selectedImage.value = image
  deletingImage.value = true
}
const imageForm = useForm({ images: [] as File[] })
function chooseImages(event: Event) {
  imageForm.images = Array.from((event.target as HTMLInputElement).files || [])
}
function uploadImages() {
  imageForm.post(urlFor('seller.images.store', { productId: props.product.id }), {
    preserveScroll: true,
    onSuccess: () => {
      imageForm.reset()
    },
  })
}
const form = useForm({
  title: 'Default',
  sku: '',
  priceAmount: 0,
  compareAtPriceAmount: null as number | null,
  currencyCode: 'PHP',
  inventoryQuantity: null as number | null,
  availableForSale: true,
  options: [] as { name: string; value: string }[],
})
function edit(variant?: Data.Seller.Variant) {
  selected.value = variant
  form.reset()
  form.clearErrors()
  form.currencyCode = props.product.variants?.[0]?.currencyCode || 'PHP'
  if (variant)
    Object.assign(form, {
      title: variant.title,
      sku: variant.sku || '',
      priceAmount: variant.priceAmount,
      compareAtPriceAmount: variant.compareAtPriceAmount,
      currencyCode: variant.currencyCode,
      inventoryQuantity: variant.inventoryQuantity,
      availableForSale: variant.availableForSale,
      options: Object.entries(variant.options || {}).map(([name, value]) => ({ name, value })),
    })
  open.value = true
}
function save() {
  form.transform((data) => ({
    ...data,
    sku: data.sku || null,
    compareAtPriceAmount:
      data.compareAtPriceAmount === null || String(data.compareAtPriceAmount).trim() === ''
        ? null
        : Number(data.compareAtPriceAmount),
    inventoryQuantity:
      data.inventoryQuantity === null || String(data.inventoryQuantity).trim() === ''
        ? null
        : Number(data.inventoryQuantity),
  }))
  const options = {
    preserveScroll: true,
    onSuccess: () => {
      open.value = false
    },
  }
  if (selected.value)
    form.patch(
      urlFor('seller.variants.update', { productId: props.product.id, id: selected.value.id }),
      options
    )
  else form.post(urlFor('seller.variants.store', { productId: props.product.id }), options)
}
</script>

<template>
  <Head :title="`${product.title} variants`" />
  <ResourceTable
    title="Variants"
    singular="variant"
    :description="`Set prices, options, and stock for ${product.title}.`"
    :rows="product.variants || []"
    :columns="columns"
    :search-text="(variant) => `${variant.title} ${variant.sku || ''}`"
    :status="(variant) => (variant.availableForSale ? 'available' : 'unavailable')"
    :filters="[
      { label: 'Available', value: 'available' },
      { label: 'Unavailable', value: 'unavailable' },
    ]"
    can-create
    can-edit
    :can-delete="() => true"
    @create="edit()"
    @edit="edit"
    @delete="requestDelete"
  >
    <template #header
      ><UButton
        label="Images"
        icon="i-lucide-image"
        color="neutral"
        variant="outline"
        @click="imagesOpen = true"
    /></template>
    <template #breadcrumb
      ><Link
        route="seller.products.index"
        class="inline-flex items-center gap-1 text-sm text-primary mb-3"
        ><UIcon name="i-lucide-arrow-left" class="size-4" />Products</Link
      ></template
    >
    <EditorModal
      v-model:open="open"
      :title="selected ? 'Edit variant' : 'Add variant'"
      description="Leave stock empty for untracked inventory. Zero means sold out."
      :processing="form.processing"
      @submit="save"
    >
      <div class="grid sm:grid-cols-2 gap-4">
        <UFormField name="title" label="Title" :error="form.errors.title" required
          ><UInput v-model="form.title" class="w-full" required
        /></UFormField>
        <UFormField name="sku" label="SKU" :error="form.errors.sku"
          ><UInput v-model="form.sku" class="w-full"
        /></UFormField>
        <UFormField name="priceAmount" label="Price" :error="form.errors.priceAmount" required
          ><UInput
            v-model="form.priceAmount"
            type="number"
            min="0"
            step="0.01"
            class="w-full"
            required
        /></UFormField>
        <UFormField
          name="compareAtPriceAmount"
          label="Compare-at price"
          :error="form.errors.compareAtPriceAmount"
          ><UInput
            v-model="form.compareAtPriceAmount"
            type="number"
            min="0"
            step="0.01"
            class="w-full"
        /></UFormField>
        <UFormField name="currencyCode" label="Currency" :error="form.errors.currencyCode"
          ><USelect v-model="form.currencyCode" :items="['PHP', 'USD']" class="w-full"
        /></UFormField>
        <UFormField
          name="inventoryQuantity"
          label="Stock quantity"
          :error="form.errors.inventoryQuantity"
          ><UInput
            v-model="form.inventoryQuantity"
            type="number"
            min="0"
            step="1"
            class="w-full"
            placeholder="Untracked"
        /></UFormField>
      </div>
      <UFormField
        name="options"
        label="Options"
        description="For example Color: Blue or Size: Small."
        :error="form.errors.options"
      >
        <div class="space-y-3">
          <div v-for="(option, index) in form.options" :key="index" class="flex items-start gap-2">
            <UFormField
              :name="`options.${index}.name`"
              :error="form.errors[`options.${index}.name` as keyof typeof form.errors]"
              class="flex-1"
              ><UInput
                v-model="option.name"
                :aria-label="`Option ${index + 1} name`"
                placeholder="Name"
                class="w-full"
                required
            /></UFormField>
            <UFormField
              :name="`options.${index}.value`"
              :error="form.errors[`options.${index}.value` as keyof typeof form.errors]"
              class="flex-1"
              ><UInput
                v-model="option.value"
                :aria-label="`Option ${index + 1} value`"
                placeholder="Value"
                class="w-full"
                required
            /></UFormField>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              :aria-label="`Remove option ${index + 1}`"
              @click="form.options.splice(index, 1)"
            />
          </div>
          <UButton
            v-if="form.options.length < 3"
            label="Add option"
            icon="i-lucide-plus"
            color="neutral"
            variant="outline"
            @click="form.options.push({ name: '', value: '' })"
          />
        </div>
      </UFormField>
      <UFormField name="availableForSale" :error="form.errors.availableForSale"
        ><USwitch v-model="form.availableForSale" label="Available for sale"
      /></UFormField>
    </EditorModal>
    <DeleteModal
      v-if="selected"
      v-model:open="deleting"
      title="Delete variant?"
      :description="`Delete ${selected.title}? It will be removed from active carts. Existing order details are retained. This cannot be undone.`"
      :action="urlFor('seller.variants.destroy', { productId: product.id, id: selected.id })"
    />
    <UModal
      v-model:open="imagesOpen"
      title="Product images"
      description="The first image is the storefront cover. Upload up to 10 images at a time, 5 MB each."
      :ui="{ content: 'sm:max-w-xl' }"
    >
      <template #body>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          <div
            v-for="(image, index) in images"
            :key="image.id"
            class="rounded-lg border border-default overflow-hidden"
          >
            <img :src="image.url" :alt="image.altText" class="aspect-square object-cover w-full" />
            <div class="flex items-center justify-between p-2 gap-2">
              <span class="text-xs text-muted">{{
                index === 0 ? 'Cover' : `Image ${index + 1}`
              }}</span
              ><UButton
                icon="i-lucide-trash"
                color="error"
                variant="ghost"
                :aria-label="`Remove image ${index + 1}`"
                @click="requestImageDelete(image)"
              />
            </div>
          </div>
        </div>
        <p v-if="!images.length" class="text-sm text-muted mb-4">
          No images yet. Add a photo to show your product in the storefront.
        </p>
        <form class="space-y-4" @submit.prevent="uploadImages">
          <UFormField
            name="images"
            label="Choose images"
            :error="
              Object.values(imageForm.errors).length
                ? Object.values(imageForm.errors).join(' ')
                : undefined
            "
            ><UInput
              :key="images.length"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              class="w-full"
              @change="chooseImages"
          /></UFormField>
          <UButton
            type="submit"
            label="Upload images"
            icon="i-lucide-upload"
            :loading="imageForm.processing"
            :disabled="!imageForm.images.length || imageForm.processing"
          />
        </form>
      </template>
    </UModal>
    <DeleteModal
      v-if="selectedImage"
      v-model:open="deletingImage"
      title="Remove product image?"
      description="This image will be removed from the storefront. This cannot be undone."
      :action="urlFor('seller.images.destroy', { productId: product.id, id: selectedImage.id })"
    />
  </ResourceTable>
</template>

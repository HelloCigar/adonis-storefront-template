<script setup lang="ts">
import { computed, ref } from 'vue'
import { Head } from '@inertiajs/vue3'
import { useRouter } from '@adonisjs/inertia/vue'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Data } from '@generated/data'
import { urlFor } from '~/client'
import DetailsForm from '~/components/seller/products/DetailsForm.vue'
import MediaSection from '~/components/seller/products/MediaSection.vue'
import DeleteImageModal from '~/components/seller/products/DeleteImageModal.vue'
import DeleteProductModal from '~/components/seller/products/DeleteModal.vue'
import OptionsEditor from '~/components/seller/variants/OptionsEditor.vue'
import VariantsTable from '~/components/seller/variants/Table.vue'
import EditModal from '~/components/seller/variants/EditModal.vue'
import GenerateModal from '~/components/seller/variants/GenerateModal.vue'
import DeleteModal from '~/components/seller/variants/DeleteModal.vue'
const props = defineProps<{ product: Data.Seller.Product; images: Data.Shared.Media[] }>()
const router = useRouter()
const selected = ref<Data.Seller.Variant>()
const editing = ref(false)
const generating = ref(false)
const deleting = ref(false)
const selectedImage = ref<Data.Shared.Media>()
const deletingImage = ref(false)
const deletingProduct = ref(false)
const showInStorefront = computed(
  () => props.product.status === 'active' && !!props.product.variants?.length
)
const menu = computed<DropdownMenuItem[]>(() => [
  {
    label: 'Delete product',
    icon: 'i-lucide-trash',
    color: 'error',
    onSelect: () => {
      deletingProduct.value = true
    },
  },
])
function edit(variant?: Data.Seller.Variant) {
  selected.value = variant
  editing.value = true
}
function adjustStock(variant: Data.Seller.Variant) {
  router.visit({
    route: 'seller.stock_adjustments.index',
    routeParams: { productId: props.product.id, variantId: variant.id },
  })
}
function requestDelete(variant: Data.Seller.Variant) {
  selected.value = variant
  deleting.value = true
}
function requestImageDelete(image: Data.Shared.Media) {
  selectedImage.value = image
  deletingImage.value = true
}
</script>

<template>
  <Head :title="product.title" />
  <UDashboardPanel id="product">
    <template #header>
      <UDashboardNavbar :title="product.title">
        <template #leading>
          <UDashboardSidebarCollapse />
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            aria-label="Back to products"
            :to="urlFor('seller.products.index')"
          />
        </template>
        <template #right>
          <UButton
            v-if="showInStorefront"
            label="View in storefront"
            aria-label="View in storefront"
            :ui="{ label: 'hidden sm:inline' }"
            icon="i-lucide-external-link"
            color="neutral"
            variant="outline"
            :to="urlFor('products.show', { handle: product.handle })"
            target="_blank"
          />
          <UDropdownMenu :items="menu" :content="{ align: 'end' }">
            <UButton
              icon="i-lucide-ellipsis-vertical"
              color="neutral"
              variant="ghost"
              aria-label="More product actions"
            />
          </UDropdownMenu>
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="mx-auto w-full max-w-6xl space-y-6">
        <DetailsForm :product="product" />
        <MediaSection :product="product" :images="images" @remove="requestImageDelete" />
        <OptionsEditor :product="product" />
        <VariantsTable
          :product="product"
          :images="images"
          @create="edit()"
          @edit="edit"
          @stock="adjustStock"
          @delete="requestDelete"
          @generate="generating = true"
        />
      </div>
    </template>
  </UDashboardPanel>

  <EditModal v-model:open="editing" :variant="selected" :product="product" :images="images" />
  <GenerateModal v-model:open="generating" :product="product" />
  <DeleteModal
    v-if="selected"
    v-model:open="deleting"
    :variant="selected"
    :product-id="product.id"
  />
  <DeleteImageModal
    v-if="selectedImage"
    v-model:open="deletingImage"
    :image="selectedImage"
    :product-id="product.id"
  />
  <DeleteProductModal v-model:open="deletingProduct" :product="product" />
</template>

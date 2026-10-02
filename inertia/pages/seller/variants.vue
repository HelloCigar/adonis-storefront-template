<script setup lang="ts">
import { ref } from 'vue'
import { Head } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import VariantsTable from '~/components/seller/variants/Table.vue'
import EditModal from '~/components/seller/variants/EditModal.vue'
import DeleteModal from '~/components/seller/variants/DeleteModal.vue'
import ImagesModal from '~/components/seller/products/ImagesModal.vue'
defineProps<{ product: Data.Seller.Product; images: Data.Shared.Media[] }>()
const selected = ref<Data.Seller.Variant>()
const open = ref(false)
const deleting = ref(false)
const imagesOpen = ref(false)
function edit(variant?: Data.Seller.Variant) {
  selected.value = variant
  open.value = true
}
function requestDelete(variant: Data.Seller.Variant) {
  selected.value = variant
  deleting.value = true
}
</script>
<template>
  <Head :title="`${product.title} variants`" />
  <VariantsTable
    :product="product"
    @images="imagesOpen = true"
    @create="edit()"
    @edit="edit"
    @delete="requestDelete"
  />
  <EditModal v-model:open="open" :variant="selected" :product="product" />
  <DeleteModal
    v-if="selected"
    v-model:open="deleting"
    :variant="selected"
    :product-id="product.id"
  />
  <ImagesModal v-model:open="imagesOpen" :product="product" :images="images" />
</template>

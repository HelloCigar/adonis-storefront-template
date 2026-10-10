<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Head } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import ProductsTable from '~/components/seller/products/Table.vue'
import EditModal from '~/components/seller/products/EditModal.vue'
import DeleteModal from '~/components/seller/products/DeleteModal.vue'
defineProps<{ products: Data.Seller.Product[] }>()
const selected = ref<Data.Seller.Product>()
const open = ref(false)
const deleting = ref(false)
function edit(product?: Data.Seller.Product) {
  selected.value = product
  open.value = true
}
function requestDelete(product: Data.Seller.Product) {
  selected.value = product
  deleting.value = true
}
onMounted(() => {
  const url = new URL(window.location.href)
  if (url.searchParams.has('new')) {
    edit()
    url.searchParams.delete('new')
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  }
})
</script>
<template>
  <Head title="Products" />
  <ProductsTable :products="products" @create="edit()" @edit="edit" @delete="requestDelete" />
  <EditModal v-model:open="open" :product="selected" />
  <DeleteModal v-if="selected" v-model:open="deleting" :product="selected" />
</template>

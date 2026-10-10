<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Head } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import ProductsTable from '~/components/seller/products/Table.vue'
import CreateModal from '~/components/seller/products/CreateModal.vue'
import DeleteModal from '~/components/seller/products/DeleteModal.vue'
defineProps<{ products: Data.Seller.Product[] }>()
const selected = ref<Data.Seller.Product>()
const creating = ref(false)
const deleting = ref(false)
function requestDelete(product: Data.Seller.Product) {
  selected.value = product
  deleting.value = true
}
onMounted(() => {
  const url = new URL(window.location.href)
  if (url.searchParams.has('new')) {
    creating.value = true
    url.searchParams.delete('new')
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  }
})
</script>
<template>
  <Head title="Products" />
  <ProductsTable :products="products" @create="creating = true" @delete="requestDelete" />
  <CreateModal v-model:open="creating" />
  <DeleteModal v-if="selected" v-model:open="deleting" :product="selected" />
</template>

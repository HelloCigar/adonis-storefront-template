<script setup lang="ts">
import { ref } from 'vue'
import { Head } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import CollectionsTable from '~/components/seller/collections/Table.vue'
import EditModal from '~/components/seller/collections/EditModal.vue'
import DeleteModal from '~/components/seller/collections/DeleteModal.vue'
defineProps<{ collections: Data.Seller.Collection[]; products: Data.Seller.Product[] }>()
const selected = ref<Data.Seller.Collection>()
const open = ref(false)
const deleting = ref(false)
function edit(collection?: Data.Seller.Collection) {
  selected.value = collection
  open.value = true
}
function requestDelete(collection: Data.Seller.Collection) {
  selected.value = collection
  deleting.value = true
}
</script>
<template>
  <Head title="Collections" />
  <CollectionsTable
    :collections="collections"
    @create="edit()"
    @edit="edit"
    @delete="requestDelete"
  />
  <EditModal v-model:open="open" :collection="selected" :products="products" />
  <DeleteModal v-if="selected" v-model:open="deleting" :collection="selected" />
</template>

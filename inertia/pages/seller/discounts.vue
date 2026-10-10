<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Head } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import DiscountsTable from '~/components/seller/discounts/Table.vue'
import EditModal from '~/components/seller/discounts/EditModal.vue'
import DeleteModal from '~/components/seller/discounts/DeleteModal.vue'
defineProps<{ discounts: Data.Seller.Discount[] }>()
const selected = ref<Data.Seller.Discount>()
const open = ref(false)
const deleting = ref(false)
function edit(discount?: Data.Seller.Discount) {
  selected.value = discount
  open.value = true
}
function requestDelete(discount: Data.Seller.Discount) {
  selected.value = discount
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
  <Head title="Discounts" />
  <DiscountsTable :discounts="discounts" @create="edit()" @edit="edit" @delete="requestDelete" />
  <EditModal v-model:open="open" :discount="selected" />
  <DeleteModal v-if="selected" v-model:open="deleting" :discount="selected" />
</template>

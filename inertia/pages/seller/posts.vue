<script setup lang="ts">
import { ref } from 'vue'
import { Head } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import PostsTable from '~/components/seller/posts/Table.vue'
import DeleteModal from '~/components/seller/posts/DeleteModal.vue'
defineProps<{ posts: Data.Seller.Post[] }>()
const selected = ref<Data.Seller.Post>()
const deleting = ref(false)
function requestDelete(post: Data.Seller.Post) {
  selected.value = post
  deleting.value = true
}
</script>
<template>
  <Head title="Blog" />
  <PostsTable :posts="posts" @delete="requestDelete" />
  <DeleteModal v-if="selected" v-model:open="deleting" :post="selected" />
</template>

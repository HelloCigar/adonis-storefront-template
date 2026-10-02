<script setup lang="ts">
import { ref } from 'vue'
import { Head } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import UsersTable from '~/components/seller/users/Table.vue'
import EditModal from '~/components/seller/users/EditModal.vue'
import DeleteModal from '~/components/seller/users/DeleteModal.vue'
defineProps<{ users: Data.Seller.User[]; currentUserId: number; canAssignAdmin: boolean }>()
const selected = ref<Data.Seller.User>()
const open = ref(false)
const deleting = ref(false)
function edit(user?: Data.Seller.User) {
  selected.value = user
  open.value = true
}
function requestDelete(user: Data.Seller.User) {
  selected.value = user
  deleting.value = true
}
</script>
<template>
  <Head title="Users" />
  <UsersTable :users="users" @create="edit()" @edit="edit" @delete="requestDelete" />
  <EditModal
    v-model:open="open"
    :user="selected"
    :current-user-id="currentUserId"
    :can-assign-admin="canAssignAdmin"
  />
  <DeleteModal v-if="selected" v-model:open="deleting" :user="selected" />
</template>

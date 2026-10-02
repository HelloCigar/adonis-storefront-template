<script setup lang="ts">
import { h, ref, resolveComponent } from 'vue'
import { Head, useForm } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import type { TableColumn } from '@nuxt/ui'
import { urlFor } from '~/client'
import ResourceTable from '~/components/seller/ResourceTable.vue'
import EditorModal from '~/components/seller/EditorModal.vue'
import DeleteModal from '~/components/seller/DeleteModal.vue'
defineProps<{ users: Data.Seller.User[]; currentUserId: number }>()
const badge = resolveComponent('UBadge')
const columns: TableColumn<Data.Seller.User>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'fullName', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) =>
      h(badge, {
        label: row.original.role,
        color: row.original.role === 'seller' ? 'primary' : 'neutral',
        variant: 'subtle',
        class: 'capitalize',
      }),
  },
  {
    accessorKey: 'createdAt',
    header: 'Joined',
    cell: ({ row }) =>
      row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString() : '—',
  },
]
const selected = ref<Data.Seller.User>()
const open = ref(false)
const deleting = ref(false)
function requestDelete(user: Data.Seller.User) {
  selected.value = user
  deleting.value = true
}
const form = useForm({ fullName: '', email: '', role: 'customer', password: '' })
function edit(user?: Data.Seller.User) {
  selected.value = user
  form.reset()
  form.clearErrors()
  if (user)
    Object.assign(form, { fullName: user.fullName || '', email: user.email, role: user.role })
  open.value = true
}
function save() {
  const options = {
    preserveScroll: true,
    onSuccess: () => {
      open.value = false
      form.password = ''
    },
  }
  if (selected.value) form.patch(urlFor('seller.users.update', { id: selected.value.id }), options)
  else form.post(urlFor('seller.users.store'), options)
}
</script>

<template>
  <Head title="Users" />
  <ResourceTable
    title="Users"
    singular="user"
    description="Manage customer accounts and seller access."
    :rows="users"
    :columns="columns"
    :search-text="(user) => `${user.fullName || ''} ${user.email}`"
    :status="(user) => user.role"
    :filters="[
      { label: 'Customers', value: 'customer' },
      { label: 'Sellers', value: 'seller' },
    ]"
    can-create
    can-edit
    :can-delete="(user) => user.id !== currentUserId"
    @create="edit()"
    @edit="edit"
    @delete="requestDelete"
  >
    <EditorModal
      v-model:open="open"
      :title="selected ? 'Edit user' : 'Add user'"
      description="Sellers can manage the catalogue, orders, and user accounts."
      :processing="form.processing"
      @submit="save"
    >
      <UFormField name="fullName" label="Full name" :error="form.errors.fullName" required
        ><UInput v-model="form.fullName" class="w-full" required
      /></UFormField>
      <UFormField name="email" label="Email" :error="form.errors.email" required
        ><UInput v-model="form.email" type="email" class="w-full" required
      /></UFormField>
      <UFormField
        name="role"
        label="Role"
        :error="form.errors.role"
        :description="
          selected?.id === currentUserId ? 'Your own seller access cannot be removed.' : undefined
        "
        ><USelect
          v-model="form.role"
          :items="['customer', 'seller']"
          :disabled="selected?.id === currentUserId"
          class="w-full"
      /></UFormField>
      <UFormField
        v-if="!selected"
        name="password"
        label="Password"
        description="At least 8 characters."
        :error="form.errors.password"
        required
        ><UInput
          v-model="form.password"
          type="password"
          autocomplete="new-password"
          class="w-full"
          minlength="8"
          required
      /></UFormField>
    </EditorModal>
    <DeleteModal
      v-if="selected"
      v-model:open="deleting"
      title="Delete user?"
      :description="`Delete ${selected.email} and their saved addresses? Existing order history is retained. This cannot be undone.`"
      :action="urlFor('seller.users.destroy', { id: selected.id })"
    />
  </ResourceTable>
</template>

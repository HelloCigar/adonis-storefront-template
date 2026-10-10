<script setup lang="ts">
import { watch } from 'vue'
import { useForm } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import { urlFor } from '~/client'
import { statusOptions } from '~/utils/status'
const props = defineProps<{
  user?: Data.Seller.User
  currentUserId: number
  canAssignAdmin: boolean
}>()
const open = defineModel<boolean>('open', { required: true })
const form = useForm({
  fullName: '',
  email: '',
  role: 'customer' as Data.Seller.User['role'],
  password: '',
})
watch(
  open,
  (isOpen) => {
    if (!isOpen) return
    const user = props.user
    form.reset()
    form.clearErrors()
    if (user)
      Object.assign(form, { fullName: user.fullName || '', email: user.email, role: user.role })
  },
  { immediate: true }
)
function save() {
  const options = {
    preserveScroll: true,
    onSuccess: () => {
      open.value = false
      form.password = ''
    },
  }
  if (props.user) form.patch(urlFor('seller.users.update', { id: props.user.id }), options)
  else form.post(urlFor('seller.users.store'), options)
}
</script>
<template>
  <UModal
    v-model:open="open"
    :title="user ? 'Edit user' : 'Add user'"
    description="Assign customer, staff, or admin access. Only admins can manage user accounts."
    :dismissible="!form.processing"
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <form class="space-y-4" @submit.prevent="save">
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
          :description="user?.id === currentUserId ? 'Your own role cannot be changed.' : undefined"
          ><USelect
            v-model="form.role"
            :items="statusOptions('role', canAssignAdmin ? undefined : ['customer', 'staff'])"
            :disabled="user?.id === currentUserId"
            class="w-full"
        /></UFormField>
        <UFormField
          v-if="!user"
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

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            type="button"
            label="Cancel"
            color="neutral"
            variant="outline"
            :disabled="form.processing"
            @click="open = false"
          />
          <UButton
            type="submit"
            label="Save"
            :loading="form.processing"
            :disabled="form.processing"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>

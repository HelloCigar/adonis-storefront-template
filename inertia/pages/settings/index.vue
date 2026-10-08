<script setup lang="ts">
import { Form, useRouter } from '@adonisjs/inertia/vue'
import { usePage } from '@inertiajs/vue3'
import { computed, onUnmounted, ref } from 'vue'

const page = usePage()
const toast = useToast()
const router = useRouter()
const fileRef = ref<HTMLInputElement>()
const name = ref(page.props.user?.fullName ?? '')
const previewUrl = ref<string | null>(null)
const avatarUrl = computed(() => previewUrl.value ?? page.props.user?.avatarUrl ?? undefined)

function onFileChange(event: Event) {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  const input = event.target as HTMLInputElement
  previewUrl.value = input.files?.[0] ? URL.createObjectURL(input.files[0]) : null
}

function clearPreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = null
  if (fileRef.value) fileRef.value.value = ''
}

function onSaved() {
  clearPreview()
  toast.add({ title: 'Profile updated', color: 'success', icon: 'i-lucide-check' })
}

function removeAvatar() {
  router.delete(
    { route: 'settings.avatar.destroy' },
    {
      onSuccess: () => {
        clearPreview()
        toast.add({ title: 'Avatar removed', color: 'success', icon: 'i-lucide-check' })
      },
    }
  )
}

onUnmounted(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})
</script>

<template>
  <Form
    v-slot="{ processing, errors }"
    route="settings.update"
    enctype="multipart/form-data"
    @success="onSaved"
  >
    <UPageCard
      title="Profile"
      description="Update the details shown on your account."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        label="Save changes"
        color="neutral"
        type="submit"
        :loading="processing"
        :disabled="processing"
        class="w-fit lg:ms-auto"
      />
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField
        name="fullName"
        label="Name"
        description="Shown on your account and in the dashboard."
        :error="errors.fullName"
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput v-model="name" name="fullName" autocomplete="name" class="w-full sm:w-72" />
      </UFormField>
      <USeparator />
      <UFormField
        name="email"
        label="Email"
        description="Used to sign in to your account."
        :error="errors.email"
        required
        class="flex max-sm:flex-col justify-between items-start gap-4"
      >
        <UInput
          name="email"
          type="email"
          :default-value="page.props.user?.email ?? ''"
          autocomplete="email"
          class="w-full sm:w-72"
        />
      </UFormField>
      <USeparator />
      <UFormField
        name="avatar"
        label="Avatar"
        description="JPG, GIF, or PNG. Maximum 1 MB."
        :error="errors.avatar"
        class="flex max-sm:flex-col justify-between sm:items-center gap-4"
      >
        <div class="flex flex-wrap items-center gap-3">
          <UAvatar :src="avatarUrl" :text="page.props.user?.initials" :alt="name" size="lg" />
          <UButton type="button" label="Choose image" color="neutral" @click="fileRef?.click()" />
          <UButton
            v-if="page.props.user?.avatarUrl"
            type="button"
            label="Remove"
            color="error"
            variant="soft"
            @click="removeAvatar"
          />
          <input
            ref="fileRef"
            name="avatar"
            type="file"
            class="sr-only"
            accept=".jpg,.jpeg,.png,.gif"
            @change="onFileChange"
          />
        </div>
      </UFormField>
    </UPageCard>
  </Form>
</template>

<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import { urlFor } from '~/client'
defineProps<{ discount: Data.Checkout.Quote['discount']; error: string | null }>()
const form = useForm({ code: '' })
const options = { preserveScroll: true, preserveState: true }
function apply() {
  if (!form.code.trim() || form.processing) return
  form.post(urlFor('checkout.discount.store'), { ...options, onSuccess: () => form.reset() })
}
function remove() {
  form.delete(urlFor('checkout.discount.destroy'), options)
}
</script>
<template>
  <div class="border-t border-default mt-5 pt-5">
    <div v-if="discount" class="flex items-center justify-between gap-3 text-sm">
      <span class="inline-flex items-center gap-2">
        <UIcon name="i-lucide-tag" class="text-primary" />
        <span class="font-medium">{{ discount.code }}</span>
        <span class="text-muted">applied</span>
      </span>
      <UButton
        type="button"
        label="Remove"
        variant="link"
        color="neutral"
        size="sm"
        :loading="form.processing"
        @click="remove"
      />
    </div>
    <UAlert
      v-else-if="error"
      color="warning"
      variant="soft"
      icon="i-lucide-tag"
      :title="error"
      :actions="[{ label: 'Remove code', color: 'neutral', variant: 'outline', onClick: remove }]"
    />
    <UFormField v-else label="Discount code" :error="form.errors.code">
      <div class="flex gap-2">
        <UInput
          v-model="form.code"
          autocomplete="off"
          autocapitalize="characters"
          maxlength="40"
          class="flex-1"
          @keydown.enter.prevent="apply"
        />
        <UButton
          type="button"
          label="Apply"
          color="neutral"
          variant="outline"
          :loading="form.processing"
          :disabled="!form.code.trim() || form.processing"
          @click="apply"
        />
      </div>
    </UFormField>
  </div>
</template>

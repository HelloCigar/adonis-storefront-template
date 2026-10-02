<script setup lang="ts">
import { Form, type FormRef } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import { ref, watch } from 'vue'
defineProps<{ product: Data.Seller.Product }>()
const open = defineModel<boolean>('open', { required: true })
const form = ref<FormRef>()
watch(open, () => form.value?.clearErrors())
</script>

<template>
  <UModal
    v-model:open="open"
    title="Delete product?"
    :description="`Delete ${product.title} and its variants? Existing orders keep their purchase details. This cannot be undone.`"
    :dismissible="!form?.processing"
  >
    <template #body>
      <Form
        ref="form"
        v-slot="{ errors, processing }"
        route="seller.products.destroy"
        :params="{ id: product.id }"
        :options="{ preserveScroll: true }"
        @success="open = false"
      >
        <UAlert
          v-if="Object.values(errors).length"
          color="error"
          :title="Object.values(errors).join(' ')"
          class="mb-4"
        />
        <div class="flex justify-end gap-2">
          <UButton
            type="button"
            label="Cancel"
            color="neutral"
            variant="outline"
            :disabled="processing"
            @click="open = false"
          />
          <UButton
            type="submit"
            label="Delete"
            color="error"
            :loading="processing"
            :disabled="processing"
          />
        </div>
      </Form>
    </template>
  </UModal>
</template>

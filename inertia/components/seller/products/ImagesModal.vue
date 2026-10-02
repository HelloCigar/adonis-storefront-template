<script setup lang="ts">
import { ref } from 'vue'
import { Form } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import DeleteImageModal from './DeleteImageModal.vue'
defineProps<{ product: Data.Seller.Product; images: Data.Shared.Media[] }>()
const open = defineModel<boolean>('open', { required: true })
const deletingImage = ref(false)
const selectedImage = ref<Data.Shared.Media>()
function requestImageDelete(image: Data.Shared.Media) {
  selectedImage.value = image
  deletingImage.value = true
}
const hasImages = ref(false)
function chooseImages(event: Event) {
  hasImages.value = !!(event.target as HTMLInputElement).files?.length
}
</script>
<template>
  <UModal
    v-model:open="open"
    title="Product images"
    description="The first image is the storefront cover. Upload up to 10 images at a time, 5 MB each."
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #body>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <div
          v-for="(image, index) in images"
          :key="image.id"
          class="rounded-lg border border-default overflow-hidden"
        >
          <img :src="image.url" :alt="image.altText" class="aspect-square object-cover w-full" />
          <div class="flex items-center justify-between p-2 gap-2">
            <span class="text-xs text-muted">{{
              index === 0 ? 'Cover' : `Image ${index + 1}`
            }}</span
            ><UButton
              icon="i-lucide-trash"
              color="error"
              variant="ghost"
              :aria-label="`Remove image ${index + 1}`"
              @click="requestImageDelete(image)"
            />
          </div>
        </div>
      </div>
      <p v-if="!images.length" class="text-sm text-muted mb-4">
        No images yet. Add a photo to show your product in the storefront.
      </p>
      <Form
        v-slot="{ errors, processing, progress }"
        route="seller.images.store"
        :params="{ productId: product.id }"
        :options="{ preserveScroll: true }"
        reset-on-success
        class="space-y-4"
        @success="hasImages = false"
      >
        <UFormField
          name="images"
          label="Choose images"
          :error="Object.values(errors).length ? Object.values(errors).join(' ') : undefined"
          ><UInput
            name="images[]"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            class="w-full"
            @change="chooseImages"
        /></UFormField>
        <UButton
          type="submit"
          label="Upload images"
          icon="i-lucide-upload"
          :loading="processing"
          :disabled="!hasImages || processing"
        />
        <UProgress v-if="progress" :model-value="progress.percentage" />
      </Form>
    </template>
  </UModal>

  <DeleteImageModal
    v-if="selectedImage"
    v-model:open="deletingImage"
    :image="selectedImage"
    :product-id="product.id"
  />
</template>

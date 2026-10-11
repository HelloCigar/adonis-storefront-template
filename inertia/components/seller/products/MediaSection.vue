<script setup lang="ts">
import { Form } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
defineProps<{ product: Data.Seller.Product; images: Data.Shared.Media[] }>()
const emit = defineEmits<{ remove: [image: Data.Shared.Media] }>()
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="font-semibold text-highlighted">Images</h2>
      <p class="mt-1 text-sm text-muted">
        The first image is the storefront cover. JPEG, PNG or WebP, up to 5 MB each.
      </p>
    </template>

    <div class="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      <div
        v-for="(image, index) in images"
        :key="image.id"
        class="group relative overflow-hidden rounded-md ring-1 ring-inset ring-default"
      >
        <img :src="image.url" :alt="image.altText" class="aspect-square w-full object-cover" />
        <UBadge
          v-if="index === 0"
          label="Cover"
          color="neutral"
          variant="solid"
          size="sm"
          class="absolute left-1.5 top-1.5"
        />
        <UButton
          type="button"
          icon="i-lucide-trash"
          color="neutral"
          variant="solid"
          size="xs"
          class="absolute right-1.5 top-1.5"
          :aria-label="`Remove image ${index + 1}`"
          @click="emit('remove', image)"
        />
      </div>

      <Form
        v-slot="{ errors, processing, progress, submit }"
        route="seller.images.store"
        :params="{ productId: product.id }"
        :options="{ preserveScroll: true }"
        reset-on-success
        reset-on-error
        class="contents"
      >
        <label
          class="relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-accented p-2 text-center text-sm text-muted transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary hover:border-primary hover:text-highlighted"
          :class="processing && 'pointer-events-none opacity-60'"
        >
          <UIcon
            :name="processing ? 'i-lucide-loader-circle' : 'i-lucide-image-plus'"
            class="size-6"
            :class="processing && 'animate-spin'"
          />
          <span>{{ processing ? 'Uploading…' : 'Add images' }}</span>
          <input
            type="file"
            name="images[]"
            multiple
            accept="image/jpeg,image/png,image/webp"
            class="absolute inset-0 size-full cursor-pointer opacity-0"
            :disabled="processing"
            @change="submit()"
          />
        </label>
        <div
          v-if="progress || Object.values(errors).length"
          class="col-span-full space-y-2"
          role="status"
        >
          <UProgress v-if="progress" :model-value="progress.percentage" />
          <p v-if="Object.values(errors).length" class="text-sm text-error" role="alert">
            {{ Object.values(errors).join(' ') }}
          </p>
        </div>
      </Form>
    </div>

    <p v-if="!images.length" class="mt-4 text-sm text-muted">
      No images yet. Add a photo to show this product in the storefront.
    </p>
  </UCard>
</template>

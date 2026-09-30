<script setup lang="ts">
import { ref } from 'vue'
import type { Data } from '@generated/data'
import { computed, watch } from 'vue'
import { usePage, router } from '@inertiajs/vue3'
import { t, storePath as localePath } from '~/utils/store'
import type { Variant } from '~/types/store'
import ProductCard from '~/components/product/Card.vue'
import ProductConfigurator from '~/components/product/Configurator.vue'
import ProductGallery from '~/components/product/Gallery.vue'
import { Head } from '@inertiajs/vue3'
const props = defineProps<{ product: Data.Product; recommendations: Data.Product[] }>()
const page = usePage()
const handle = computed(() => props.product.handle)
const selectedVariant = ref<Variant>()
watch(
  () => props.product,
  (product) => {
    const id = new URLSearchParams(page.url.split('?')[1]).get('variantId')
    selectedVariant.value =
      product.variants?.find((variant) => String(variant.id) === id) ??
      product.selectedOrFirstAvailableVariant ??
      product.variants?.[0]
  },
  { immediate: true }
)
watch(selectedVariant, (variant) => {
  if (!variant) return
  const query = new URLSearchParams(page.url.split('?')[1])
  if (query.get('variantId') === String(variant.id)) return
  query.set('variantId', String(variant.id))
  router.replace({
    url: localePath('/product/' + props.product.handle) + '?' + query,
    preserveState: true,
    preserveScroll: true,
  })
})
</script>
<template>
  <Head :title="product.seoTitle || product.title" />
  <UContainer class="py-6 pb-12 lg:py-8 lg:pb-16">
    <UBreadcrumb
      :items="[
        { label: t('breadcrumb.products') },
        { label: product?.title, to: localePath(`/product/${handle}`) },
      ]"
      class="mb-6 lg:mb-8"
    />

    <div v-if="product && selectedVariant" class="mb-12 lg:grid lg:grid-cols-12 lg:mb-16">
      <ProductGallery
        ref="carousel"
        :selected-variant="selectedVariant"
        :product="product"
        class="lg:col-span-6"
        thumbnails
      />

      <div class="lg:col-span-4 lg:col-start-8">
        <div class="lg:sticky lg:top-[calc(var(--ui-header-height)+3rem)]">
          <ProductConfigurator
            v-model="selectedVariant"
            :product="product"
            class="mb-12 lg:mb-16"
          />

          <p class="mb-6 lg:text-lg lg:mb-8">
            {{ product.description }}
          </p>
        </div>
      </div>
    </div>

    <div v-if="recommendations">
      <h2 class="text-3xl text-gray-900 font-bold mb-6 lg:mb-8 lg:text-4xl">
        {{ t('product.recommendations') }}
      </h2>

      <div class="mb-12 sm:px-12 lg:mb-16">
        <UCarousel
          v-slot="{ item }"
          :items="recommendations"
          :ui="{ item: 'md:basis-1/2 lg:basis-1/3' }"
          class="w-full mb-6"
          arrows
          loop
        >
          <ProductCard :product="item" :recommendations="recommendations" />
        </UCarousel>
      </div>
    </div>
  </UContainer>
</template>

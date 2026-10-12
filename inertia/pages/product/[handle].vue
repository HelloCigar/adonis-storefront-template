<script setup lang="ts">
import { urlFor } from '~/client'
import { ref } from 'vue'
import type { Data } from '@generated/data'
import { computed, watch } from 'vue'
import { usePage, router } from '@inertiajs/vue3'
import { t } from '~/utils/store'
import type { Variant } from '~/types/store'
import ProductCard from '~/components/product/Card.vue'
import ProductConfigurator from '~/components/product/Configurator.vue'
import ProductGallery from '~/components/product/Gallery.vue'
import ReviewsSection from '~/components/product/reviews/Section.vue'
import ReviewEditModal from '~/components/product/reviews/EditModal.vue'
import ReviewDeleteModal from '~/components/product/reviews/DeleteModal.vue'
import type { ReviewPagination, ReviewSummary } from '~/components/product/reviews/types'
import { Head } from '@inertiajs/vue3'
const props = defineProps<{
  product: Data.Catalog.Product
  recommendations: Data.Catalog.Product[]
  // Review props are optional because an instant visit from a product card renders this page
  // before the server has sent them.
  reviewSummary?: ReviewSummary
  reviews?: { data: Data.Catalog.Review[]; metadata: ReviewPagination }
  viewerReview?: Data.Catalog.Review | null
  canReview?: boolean
}>()
const page = usePage()
const handle = computed(() => props.product.handle)
const selectedVariant = ref<Variant>()
const reviewOpen = ref(false)
const reviewDeleting = ref(false)
watch(
  () => props.product,
  (product) => {
    const id = new URLSearchParams(page.url.split('?')[1]).get('variantId')
    selectedVariant.value =
      product.variants?.find((variant) => variant.id === id) ??
      product.selectedOrFirstAvailableVariant ??
      product.variants?.[0]
  },
  { immediate: true }
)
watch(selectedVariant, (variant) => {
  if (!variant) return
  const query = new URLSearchParams(page.url.split('?')[1])
  if (query.get('variantId') === variant.id) return
  query.set('variantId', variant.id)
  router.replace({
    url: urlFor('products.show', { handle: props.product.handle }) + '?' + query,
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
        { label: product?.title, to: urlFor('products.show', { handle }) },
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

    <ReviewsSection
      v-if="reviewSummary && reviews"
      :handle="product.handle"
      :summary="reviewSummary"
      :reviews="reviews"
      :viewer-review="viewerReview ?? null"
      :can-review="canReview ?? false"
      @write="reviewOpen = true"
      @edit="reviewOpen = true"
      @delete="reviewDeleting = true"
    />
    <ReviewEditModal
      v-if="canReview || viewerReview"
      v-model:open="reviewOpen"
      :product-id="product.id"
      :review="viewerReview"
    />
    <ReviewDeleteModal v-if="viewerReview" v-model:open="reviewDeleting" :review="viewerReview" />

    <div v-if="recommendations">
      <h2 class="text-3xl text-highlighted font-bold mb-6 lg:mb-8 lg:text-4xl">
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

<script setup lang="ts">
import { usePage } from '@inertiajs/vue3'
import { useRouter } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import { useLocalization } from '~/composables/localization'
import ReviewStars from './Stars.vue'
import type { ReviewPagination } from './types'
const props = defineProps<{
  handle: string
  reviews: { data: Data.Catalog.Review[]; metadata: ReviewPagination }
}>()
const page = usePage()
const router = useRouter()
const { locale } = useLocalization()
// A fixed store time zone keeps the server-rendered date equal to the hydrated one.
const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat(locale.value, {
        dateStyle: 'medium',
        timeZone: 'Asia/Manila',
      }).format(new Date(value))
    : ''

// Keep the rest of the query (such as the selected variant) and only swap the reviews page.
function visit(reviewsPage: number) {
  const query = Object.fromEntries(new URLSearchParams(page.url.split('?')[1]))
  router.visit(
    {
      route: 'products.show',
      routeParams: { handle: props.handle },
      qs: { ...query, reviewsPage },
    },
    { only: ['reviews'], preserveScroll: true, preserveState: true }
  )
}
</script>
<template>
  <div v-if="reviews.data.length" class="space-y-6">
    <ul class="divide-y divide-default">
      <li v-for="review in reviews.data" :key="review.id" class="space-y-2 py-5 first:pt-0">
        <ReviewStars :rating="review.rating" />
        <h3 v-if="review.title" class="font-semibold text-highlighted">{{ review.title }}</h3>
        <p v-if="review.body" class="whitespace-pre-line">{{ review.body }}</p>
        <p class="text-sm text-muted">
          <span>{{ review.authorName }}</span>
          ·
          <time :datetime="review.createdAt ?? undefined">{{ formatDate(review.createdAt) }}</time>
        </p>
      </li>
    </ul>

    <div v-if="reviews.metadata.total > reviews.metadata.perPage" class="flex justify-center">
      <UPagination
        :page="reviews.metadata.currentPage"
        :items-per-page="reviews.metadata.perPage"
        :total="reviews.metadata.total"
        @update:page="visit"
      />
    </div>
  </div>
</template>

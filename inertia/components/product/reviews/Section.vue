<script setup lang="ts">
import { computed } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import { useLocalization } from '~/composables/localization'
import ReviewList from './List.vue'
import ReviewStars from './Stars.vue'
import ReviewSummaryBlock from './Summary.vue'
import type { ReviewPagination, ReviewSummary } from './types'
const props = defineProps<{
  handle: string
  summary: ReviewSummary
  reviews: { data: Data.Catalog.Review[]; metadata: ReviewPagination }
  viewerReview: Data.Catalog.Review | null
  canReview: boolean
}>()
const emit = defineEmits<{ write: []; edit: []; delete: [] }>()
const page = usePage()
const { locale } = useLocalization()
const isGuest = computed(() => !page.props.user)
const statusNote = computed(() => {
  if (props.viewerReview?.status === 'pending') return 'Waiting for approval'
  if (props.viewerReview?.status === 'hidden') return 'Hidden by the store'
  return null
})
const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(new Date(value))
    : ''
</script>
<template>
  <section id="reviews" aria-labelledby="reviews-title" class="mb-12 scroll-mt-24 lg:mb-16">
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4 lg:mb-8">
      <h2 id="reviews-title" class="text-3xl text-highlighted font-bold lg:text-4xl">Reviews</h2>
      <UButton
        v-if="canReview"
        label="Write a review"
        icon="i-lucide-pen-line"
        color="neutral"
        variant="outline"
        @click="emit('write')"
      />
    </div>

    <div class="grid gap-8 lg:grid-cols-12 lg:gap-12">
      <div class="space-y-8 lg:col-span-4">
        <ReviewSummaryBlock :summary="summary" />

        <div
          v-if="viewerReview"
          class="space-y-3 rounded-lg border border-default bg-elevated/50 p-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="font-semibold text-highlighted">Your review</h3>
            <UBadge
              v-if="statusNote"
              :label="statusNote"
              :color="viewerReview.status === 'hidden' ? 'warning' : 'neutral'"
              variant="subtle"
            />
          </div>
          <ReviewStars :rating="viewerReview.rating" />
          <p v-if="viewerReview.title" class="font-medium text-highlighted">
            {{ viewerReview.title }}
          </p>
          <p v-if="viewerReview.body" class="whitespace-pre-line text-sm">
            {{ viewerReview.body }}
          </p>
          <p class="text-sm text-muted">
            {{ viewerReview.authorName }} ·
            <time :datetime="viewerReview.createdAt ?? undefined">{{
              formatDate(viewerReview.createdAt)
            }}</time>
          </p>
          <div class="flex flex-wrap gap-2 pt-1">
            <UButton
              label="Edit review"
              icon="i-lucide-pencil"
              color="neutral"
              variant="outline"
              size="sm"
              @click="emit('edit')"
            />
            <UButton
              label="Delete review"
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              size="sm"
              @click="emit('delete')"
            />
          </div>
        </div>

        <p v-else-if="isGuest" class="text-sm text-muted">
          <Link route="session.create" class="text-primary">Sign in</Link> to review products you've
          received.
        </p>
        <p v-else-if="!canReview" class="text-sm text-muted">
          You can review this product once an order with it has been delivered to you.
        </p>
      </div>

      <div class="lg:col-span-8">
        <ReviewList :handle="handle" :reviews="reviews" />
      </div>
    </div>
  </section>
</template>

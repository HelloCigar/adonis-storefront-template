<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import ReviewsTable from '~/components/seller/reviews/Table.vue'
defineProps<{
  reviews: {
    data: Data.Seller.Review[]
    metadata: { total: number; perPage: number; currentPage: number }
  }
  filters: { status: 'pending' | 'approved' | 'hidden' | 'all' }
  counts: { pending: number; approved: number; hidden: number }
}>()
</script>
<template>
  <Head title="Reviews" />
  <ReviewsTable :reviews="reviews" :filters="filters" :counts="counts" />
</template>

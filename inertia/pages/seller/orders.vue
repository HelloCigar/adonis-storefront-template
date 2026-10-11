<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import OrdersTable from '~/components/seller/orders/Table.vue'

type Stage = Data.Seller.OrderQueueItem['stages'][number]

defineProps<{ orders: Data.Seller.OrderQueueItem[]; stage: Stage | 'all' }>()
</script>
<template>
  <Head title="Orders" />
  <OrdersTable :orders="orders" :stage="stage" />
</template>

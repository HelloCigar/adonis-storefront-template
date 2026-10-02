<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import OrdersTable from '~/components/seller/orders/Table.vue'
defineProps<{ orders: Data.Seller.Order[] }>()
</script>
<template>
  <Head title="Orders" />
  <OrdersTable :orders="orders" />
</template>

<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { urlFor } from '~/client'
</script>

<template>
  <Head title="Inbox" />
  <UDashboardPanel id="inbox">
    <template #header>
      <UDashboardNavbar title="Inbox">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UEmpty
        icon="i-lucide-inbox"
        title="No messages"
        description="Customer messaging isn't connected yet. Order activity is recorded on each order."
        :actions="[
          {
            label: 'View orders',
            icon: 'i-lucide-shopping-bag',
            color: 'neutral',
            variant: 'subtle',
            to: urlFor('seller.orders.index'),
          },
        ]"
        class="flex-1"
      />
    </template>
  </UDashboardPanel>
</template>

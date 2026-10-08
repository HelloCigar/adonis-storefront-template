<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import EmailList from '~/components/seller/emails/List.vue'
import EmailPreview from '~/components/seller/emails/Preview.vue'
defineProps<{
  emails: Data.Seller.EmailPreview[]
  preview: Data.Seller.EmailPreview.Variants['forPreview']
}>()
</script>
<template>
  <Head :title="`${preview.name} · Emails`" />
  <UDashboardPanel id="emails">
    <template #header>
      <UDashboardNavbar title="Emails">
        <template #leading><UDashboardSidebarCollapse /></template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <p class="text-sm text-muted max-w-prose">
        Customer emails rendered with sample order data. Previews are never sent, and each one has
        its own link to share with the team.
      </p>
      <div class="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
        <EmailList :emails="emails" :selected="preview.key" />
        <EmailPreview :key="preview.key" :preview="preview" />
      </div>
    </template>
  </UDashboardPanel>
</template>

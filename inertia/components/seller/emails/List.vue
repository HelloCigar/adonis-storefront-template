<script setup lang="ts">
import { urlFor } from '~/client'
import type { Data } from '@generated/data'
defineProps<{ emails: Data.Seller.EmailPreview[]; selected: string }>()
</script>
<template>
  <nav aria-label="Emails">
    <ul class="flex flex-col gap-1">
      <li v-for="email in emails" :key="email.key">
        <ULink
          :to="urlFor('seller.emails.show', { email: email.key })"
          :active="email.key === selected"
          :aria-current="email.key === selected ? 'page' : undefined"
          raw
          class="block rounded-lg px-3 py-2.5 transition-colors"
          active-class="bg-elevated"
          inactive-class="hover:bg-elevated/50"
        >
          <span class="block font-medium text-highlighted">{{ email.name }}</span>
          <span class="block text-sm text-muted mt-0.5">{{ email.description }}</span>
        </ULink>
      </li>
    </ul>
  </nav>
</template>

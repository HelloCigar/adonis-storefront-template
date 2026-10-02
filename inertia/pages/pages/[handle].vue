<script setup lang="ts">
import { urlFor } from '~/client'
import type { Data } from '@generated/data'
import { computed } from 'vue'
import { Head } from '@inertiajs/vue3'
const props = defineProps<{ page: Data.Content.Content }>()
const handle = computed(() => props.page.handle)
</script>
<template>
  <Head :title="page.title" />
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb
      :items="[{ label: page?.title, to: urlFor('pages.show', { handle }) }]"
      class="mb-6 lg:mb-8"
    />

    <div class="prose lg:prose-lg max-w-none">
      <h1>
        {{ page?.title }}
      </h1>

      <!-- eslint-disable-next-line -->
      <div v-html="page?.body" />
    </div>
  </UContainer>
</template>

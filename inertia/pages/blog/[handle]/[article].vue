<script setup lang="ts">
import { urlFor } from '~/client'
import type { Data } from '@generated/data'
import { computed } from 'vue'
import { t } from '~/utils/store'
import { Head } from '@inertiajs/vue3'
const props = defineProps<{ blog: Data.Content; articleData: Data.Content }>()
const handle = computed(() => props.blog.handle)
const article = computed(() => props.articleData.handle)
</script>
<template>
  <Head :title="articleData.title" />
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb
      :items="[
        { label: t('breadcrumb.blog') },
        { label: blog?.title, to: urlFor('blogs.show', { handle }) },
        { label: articleData?.title, to: urlFor('articles.show', { handle, article }) },
      ]"
      class="mb-8"
    />

    <div class="prose lg:prose-lg max-w-none">
      <h1>
        {{ articleData?.title }}
      </h1>

      <!-- eslint-disable-next-line -->
      <div v-html="articleData?.contentHtml" />
    </div>
  </UContainer>
</template>

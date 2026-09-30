<script setup lang="ts">
import type { Data } from '@generated/data'
import { computed } from 'vue'
import { t, storePath as localePath } from '~/utils/store'
import { Head } from '@inertiajs/vue3'
const props = defineProps<{ blog: Data.Content; articles: Data.Content[] }>()
const handle = computed(() => props.blog.handle)
</script>
<template>
  <Head :title="blog.title" />
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb
      :items="[
        { label: t('breadcrumb.blog') },
        { label: blog?.title, to: localePath(`/blog/${handle}`) },
      ]"
      class="mb-6 lg:mb-8"
    />

    <h1 class="text-4xl lg:text-5xl text-gray-900 font-extrabold mb-6 lg:mb-8">
      {{ blog?.title }}
    </h1>

    <UBlogPosts>
      <UBlogPost
        v-for="article in articles"
        :key="article.id"
        :title="article.title"
        :date="article.publishedAt"
        :description="article.excerpt ?? undefined"
        :to="localePath(`/blog/${handle}/${article.handle}`)"
      />
    </UBlogPosts>
  </UContainer>
</template>

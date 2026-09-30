<script setup lang="ts">
import { urlFor } from '~/client'
import type { Data } from '@generated/data'
import { computed } from 'vue'
import { t } from '~/utils/store'
import { Head } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
const props = defineProps<{ blog: Data.Content; articles: Data.Content[] }>()
const handle = computed(() => props.blog.handle)
</script>
<template>
  <Head :title="blog.title" />
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb
      :items="[
        { label: t('breadcrumb.blog') },
        { label: blog?.title, to: urlFor('blogs.show', { handle }) },
      ]"
      class="mb-6 lg:mb-8"
    />

    <h1 class="text-4xl lg:text-5xl text-gray-900 font-extrabold mb-6 lg:mb-8">
      {{ blog?.title }}
    </h1>

    <UBlogPosts>
      <Link
        v-for="article in articles"
        :key="article.id"
        route="articles.show"
        view-transition
        :params="{ handle, article: article.handle }"
        component="blog/[handle]/[article]"
        :page-props="{ blog, articleData: article }"
        class="block rounded-lg focus-visible:outline-2 focus-visible:outline-primary"
      >
        <UBlogPost
          :title="article.title"
          :date="article.publishedAt"
          :description="article.excerpt ?? undefined"
        />
      </Link>
    </UBlogPosts>
  </UContainer>
</template>

<script setup lang="ts">
import { urlFor } from '~/client'
import type { Data } from '@generated/data'
import { computed } from 'vue'
import { t } from '~/utils/store'
import { Head, InfiniteScroll } from '@inertiajs/vue3'
import { usePreferredReducedMotion } from '@vueuse/core'
defineProps<{ posts: { data: Data.Content.BlogPost[] } }>()

// The timeline beam follows page scroll on a spring; readers who ask for less motion get a
// static track instead.
const reducedMotion = usePreferredReducedMotion()
const indicatorMotion = computed(() =>
  reducedMotion.value === 'reduce' ? false : { stiffness: 180, damping: 30 }
)
</script>
<template>
  <Head :title="t('blog.title')" />
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb :items="[{ label: t('blog.title') }]" class="mb-6 lg:mb-8" />

    <h1 class="text-4xl lg:text-5xl text-highlighted font-extrabold mb-6 lg:mb-8">
      {{ t('blog.title') }}
    </h1>

    <p class="lg:text-lg max-w-md mb-8 lg:mb-10">
      {{ t('blog.description') }}
    </p>

    <InfiniteScroll v-if="posts.data.length" data="posts" only-next>
      <UChangelogVersions :indicator-motion="indicatorMotion">
        <UChangelogVersion
          v-for="post in posts.data"
          :key="post.id"
          :title="post.title"
          :description="post.excerpt ?? undefined"
          :date="post.publishedAt ?? undefined"
          :badge="post.badge ?? undefined"
          :authors="post.authorName ? [{ name: post.authorName }] : undefined"
          :to="urlFor('blog.show', { handle: post.handle })"
        />
      </UChangelogVersions>

      <template #loading>
        <div class="flex justify-center py-8">
          <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-dimmed" />
          <span class="sr-only">{{ t('blog.loading') }}</span>
        </div>
      </template>
    </InfiniteScroll>

    <UEmpty
      v-else
      icon="i-lucide-newspaper"
      :title="t('blog.empty.title')"
      :description="t('blog.empty.description')"
    />
  </UContainer>
</template>

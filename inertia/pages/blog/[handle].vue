<script setup lang="ts">
import { urlFor } from '~/client'
import type { Data } from '@generated/data'
import { computed } from 'vue'
import { t } from '~/utils/store'
import { Head } from '@inertiajs/vue3'
import { useLocalization } from '~/composables/localization'
const props = defineProps<{ post: Data.Content.BlogPost.Variants['forDetailedView'] }>()
const { locale } = useLocalization()
const publishedOn = computed(() =>
  props.post.publishedAt
    ? new Intl.DateTimeFormat(locale.value, { dateStyle: 'long', timeZone: 'UTC' }).format(
        new Date(props.post.publishedAt)
      )
    : null
)
</script>
<template>
  <Head :title="post.title" />
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb
      :items="[
        { label: t('blog.title'), to: urlFor('blog.index') },
        { label: post.title, to: urlFor('blog.show', { handle: post.handle }) },
      ]"
      class="mb-6 lg:mb-8"
    />

    <article class="max-w-3xl">
      <header class="mb-8 lg:mb-10">
        <div class="flex flex-wrap items-center gap-3 mb-4 text-sm text-muted">
          <UBadge v-if="post.badge" :label="post.badge" color="neutral" variant="solid" />
          <time v-if="publishedOn" :datetime="post.publishedAt ?? undefined">
            {{ publishedOn }}
          </time>
          <span v-if="post.authorName">{{ t('blog.by', { name: post.authorName }) }}</span>
        </div>

        <h1 class="text-4xl lg:text-5xl text-highlighted font-extrabold text-pretty">
          {{ post.title }}
        </h1>

        <p v-if="post.excerpt" class="mt-4 lg:text-lg text-muted">
          {{ post.excerpt }}
        </p>
      </header>

      <!-- Read-only Nuxt UI editor: the post looks as it did in the staff editor, and Tiptap
      parses the stored HTML into its schema instead of injecting it as raw markup. -->
      <UEditor
        :model-value="post.contentHtml"
        content-type="html"
        :editable="false"
        :ui="{ base: 'sm:px-0' }"
      />
    </article>
  </UContainer>
</template>

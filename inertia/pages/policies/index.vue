<script setup lang="ts">
import type { Data } from '@generated/data'
import { t } from '~/utils/store'
import { Head } from '@inertiajs/vue3'
import { Link } from '@adonisjs/inertia/vue'
defineProps<{ policies: Data.Content.Content[] }>()
</script>
<template>
  <Head :title="t('policies.title')" />
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb :items="[{ label: t('policies.title') }]" class="mb-6 lg:mb-8" />

    <h1 class="text-4xl lg:text-5xl text-highlighted font-extrabold mb-6 lg:mb-8">
      {{ t('policies.title') }}
    </h1>

    <p class="lg:text-lg max-w-md mb-8 lg:mb-10">
      {{ t('policies.description') }}
    </p>

    <div
      v-if="policies?.length"
      class="sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-2 lg:grid-cols-3"
    >
      <Link
        v-for="policy in policies"
        :key="policy.id"
        route="policies.show"
        view-transition
        :params="{ handle: policy.handle }"
        component="policies/[handle]"
        :page-props="{ policy }"
        class="block mb-4 rounded-lg focus-visible:outline-2 focus-visible:outline-primary"
      >
        <UPageCard :title="policy.title" />
      </Link>
    </div>

    <div v-else class="flex items-center gap-2">
      <UIcon name="i-lucide-triangle-alert" class="text-dimmed size-6" />

      <p class="text-xl text-dimmed">
        {{ t('policies.empty') }}
      </p>
    </div>
  </UContainer>
</template>

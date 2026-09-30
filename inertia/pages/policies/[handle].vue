<script setup lang="ts">
import type { Data } from '@generated/data'
import { computed } from 'vue'
import { t, storePath as localePath } from '~/utils/store'
import { Head } from '@inertiajs/vue3'
const props = defineProps<{ policy: Data.Content }>()
const handle = computed(() => props.policy.handle)
</script>
<template>
  <Head :title="policy.title" />
  <UContainer class="py-6 lg:py-8">
    <UBreadcrumb
      :items="[
        { label: t('policies.title'), to: localePath('/policies') },
        { label: policy?.title, to: localePath(`/policies/${handle}`) },
      ]"
      class="mb-6 lg:mb-8"
    />

    <div class="prose lg:prose-lg max-w-none">
      <h1>
        {{ policy?.title }}
      </h1>

      <!-- eslint-disable-next-line -->
      <div v-html="policy?.body" />
    </div>
  </UContainer>
</template>

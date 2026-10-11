<script setup lang="ts">
import { computed } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { urlFor } from '~/client'
const page = usePage()
const storeName = computed(() => page.props.storeName)
</script>
<template>
  <ULink
    :to="urlFor('home')"
    :aria-label="storeName"
    class="flex items-center gap-1 sm:mr-4 shrink-0 font-bold"
  >
    <span
      aria-hidden="true"
      class="size-7 mb-0.5 bg-primary [mask:url('/store-logo.svg')_center/contain_no-repeat]"
    />

    <span class="hidden sm:inline">{{ storeName }}</span>
  </ULink>
</template>

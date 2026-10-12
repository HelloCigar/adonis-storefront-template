<script setup lang="ts">
import { urlFor } from '~/client'
</script>

<template>
  <UAlert
    color="primary"
    variant="subtle"
    icon="i-lucide-store"
    title="Your store isn't fully set up"
    description="Add your store's name, shipping fee, and policies before you launch."
    :actions="[
      {
        label: 'Finish setting up your store',
        to: urlFor('setup.index'),
        color: 'primary',
        variant: 'solid',
      },
    ]"
  />
</template>

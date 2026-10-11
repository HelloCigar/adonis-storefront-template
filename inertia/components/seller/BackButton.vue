<script setup lang="ts">
/**
 * Back navigation for staff detail pages. Place it in the `#leading` slot of the page's
 * `UDashboardNavbar`, after `UDashboardSidebarCollapse`, so every page puts it beside the
 * title. `label` names the destination ("products", "Blog", a product title).
 */
defineProps<{ to: string; label: string }>()
</script>

<template>
  <UTooltip :text="`Back to ${label}`">
    <UButton
      icon="i-lucide-arrow-left"
      color="neutral"
      variant="ghost"
      :aria-label="`Back to ${label}`"
      :to="to"
    />
  </UTooltip>
</template>

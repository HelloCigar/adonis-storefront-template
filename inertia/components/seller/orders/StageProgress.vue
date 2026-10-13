<script setup lang="ts">
export type Stage = {
  title: string
  icon: string
  state: 'done' | 'current' | 'attention' | 'upcoming' | 'closed'
  text: string
}
defineProps<{ stages: Stage[] }>()
</script>

<template>
  <ol aria-label="Fulfillment progress" class="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
    <li
      v-for="(stage, index) in stages"
      :key="stage.title"
      :aria-current="stage.state === 'current' || stage.state === 'attention' ? 'step' : undefined"
      class="flex min-w-0 items-center gap-1.5"
    >
      <UIcon
        v-if="index > 0"
        name="i-lucide-chevron-right"
        class="size-3.5 shrink-0 text-dimmed"
        aria-hidden="true"
      />
      <UIcon
        :name="
          stage.state === 'done'
            ? 'i-lucide-circle-check'
            : stage.state === 'attention'
              ? 'i-lucide-triangle-alert'
              : stage.state === 'closed'
                ? 'i-lucide-circle-slash'
                : stage.icon
        "
        class="size-4 shrink-0"
        :class="{
          'text-success': stage.state === 'done',
          'text-warning': stage.state === 'attention',
          'text-primary': stage.state === 'current',
          'text-muted': stage.state === 'upcoming' || stage.state === 'closed',
        }"
        aria-hidden="true"
      />
      <span
        :class="{
          'font-medium text-highlighted': stage.state === 'current' || stage.state === 'attention',
          'text-muted': ['done', 'upcoming', 'closed'].includes(stage.state),
        }"
        >{{ stage.title }}<span class="sr-only">: {{ stage.text }}</span></span
      >
    </li>
  </ol>
</template>

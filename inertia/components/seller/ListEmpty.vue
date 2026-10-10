<script setup lang="ts">
import { computed } from 'vue'
import type { ButtonProps } from '@nuxt/ui'

/**
 * Empty state for staff list pages. Use the default mode when nothing exists
 * yet, and say what the list is for plus the action that fills it. Set
 * `filtered` when records exist but the search or filters hide all of them;
 * it shows the shared "no matches" copy and emits `clear`.
 */
const props = withDefaults(
  defineProps<{
    icon?: string
    title?: string
    description?: string
    actions?: ButtonProps[]
    tone?: 'primary' | 'success'
    /** `naked` drops the card, for use inside a table's empty slot. */
    variant?: 'subtle' | 'naked'
    filtered?: boolean
    noun?: string
  }>(),
  {
    icon: 'i-lucide-inbox',
    title: '',
    description: '',
    actions: () => [],
    tone: 'primary',
    variant: 'subtle',
    filtered: false,
    noun: 'results',
  }
)
const emit = defineEmits<{ clear: [] }>()

const chip = {
  primary: 'bg-primary/10 text-primary ring-primary/25',
  success: 'bg-success/10 text-success ring-success/25',
  neutral: 'bg-elevated text-muted ring-default',
} as const

const content = computed(() =>
  props.filtered
    ? {
        icon: 'i-lucide-search-x',
        title: `No ${props.noun} match`,
        description: 'Try a different search or clear the filters to see everything.',
        actions: [
          {
            label: 'Clear filters',
            icon: 'i-lucide-x',
            color: 'neutral',
            variant: 'outline',
            onClick: () => emit('clear'),
          },
        ] satisfies ButtonProps[],
        chip: chip.neutral,
      }
    : {
        icon: props.icon,
        title: props.title,
        description: props.description,
        actions: props.actions,
        chip: chip[props.tone],
      }
)
</script>

<template>
  <UEmpty
    :title="content.title"
    :description="content.description"
    :actions="content.actions"
    :variant="filtered ? 'naked' : variant"
    :ui="{
      root: filtered || variant === 'naked' ? 'py-12' : 'py-12 sm:py-16',
      title: 'text-lg font-semibold',
      description: 'max-w-md text-sm text-muted',
      header: 'max-w-md',
    }"
    data-testid="list-empty"
  >
    <template #leading>
      <span class="mb-2 rounded-full p-3 ring ring-inset" :class="content.chip">
        <UIcon :name="content.icon" class="block size-6" aria-hidden="true" />
      </span>
    </template>
  </UEmpty>
</template>

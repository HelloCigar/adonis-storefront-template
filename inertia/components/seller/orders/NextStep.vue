<script setup lang="ts">
import { computed } from 'vue'
import { formatDistanceToNowStrict, parseISO } from 'date-fns'
import type { Data } from '@generated/data'
import { statusLabel } from '~/utils/status'

type Step = Data.Seller.OrderQueueItem['nextStep']

const props = defineProps<{ step: Step; waitingSince: string | null }>()

/** `iconTone` colors only the icon, so warning text never sits at low contrast on the row. */
const steps: Record<Step, { label: string; icon: string; tone: string; iconTone?: string }> = {
  review_payment: {
    label: 'Review payment',
    icon: 'i-lucide-circle-alert',
    tone: 'text-highlighted font-medium',
    iconTone: 'text-warning',
  },
  pack: {
    label: 'Pack items',
    icon: 'i-lucide-package-open',
    tone: 'text-highlighted font-medium',
  },
  add_tracking: {
    label: 'Add tracking',
    icon: 'i-lucide-truck',
    tone: 'text-highlighted font-medium',
  },
  confirm_delivery: { label: 'Confirm delivery', icon: 'i-lucide-map-pin', tone: 'text-default' },
  await_payment: {
    label: statusLabel('stage', 'awaiting_payment'),
    icon: 'i-lucide-clock',
    tone: 'text-muted',
  },
  done: { label: 'Done', icon: 'i-lucide-check', tone: 'text-muted' },
  closed: { label: 'Closed', icon: 'i-lucide-circle-slash', tone: 'text-muted' },
  none: { label: 'No action', icon: 'i-lucide-minus', tone: 'text-muted' },
}

const current = computed(() => steps[props.step])
const waiting = computed(() =>
  props.waitingSince ? `waiting ${formatDistanceToNowStrict(parseISO(props.waitingSince))}` : ''
)
</script>

<template>
  <span class="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
    <UIcon
      :name="current.icon"
      class="size-4 shrink-0"
      :class="current.iconTone ?? current.tone"
      aria-hidden="true"
    />
    <span :class="current.tone">{{ current.label }}</span>
    <span v-if="waiting" class="text-xs text-muted">{{ waiting }}</span>
  </span>
</template>

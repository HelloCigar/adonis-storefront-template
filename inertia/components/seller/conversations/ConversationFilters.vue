<script setup lang="ts">
import { computed } from 'vue'
import type { Range } from '../../../types'
import HomeDateRangePicker from '~/components/home/HomeDateRangePicker.vue'

type Filters = {
  assistant?: 'shopping' | 'copilot'
  userId?: string
  from?: string
  to?: string
  changesApplied?: boolean
  unanswered?: boolean
}

const props = defineProps<{ filters: Filters; people: { id: string; name: string }[] }>()
const emit = defineEmits<{ change: [filters: Filters] }>()

const all = 'all'
const assistants = [
  { label: 'Both assistants', value: all },
  { label: 'Copilot', value: 'copilot' },
  { label: 'Shopping assistant', value: 'shopping' },
]
const people = computed(() => [
  { label: 'Everyone', value: all },
  ...props.people.map((person) => ({ label: person.name, value: person.id })),
])

const update = (changes: Filters) => emit('change', { ...props.filters, ...changes })

/** A calendar day in the browser's zone, as the `from`/`to` query string carries it. */
const day = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const fromDay = (value: string) => {
  const [year, month, date] = value.split('-').map(Number)
  return new Date(year, month - 1, date)
}

const range = computed<Range>({
  // The picker reads a missing start as "Pick a date".
  get: () =>
    ({
      start: props.filters.from ? fromDay(props.filters.from) : undefined,
      end: props.filters.to ? fromDay(props.filters.to) : undefined,
    }) as unknown as Range,
  set: (value) => update({ from: day(value.start), to: day(value.end) }),
})
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <USelect
      :model-value="filters.assistant ?? all"
      :items="assistants"
      aria-label="Assistant"
      class="w-48"
      @update:model-value="
        (value) =>
          update({ assistant: value === all ? undefined : (value as Filters['assistant']) })
      "
    />
    <USelect
      :model-value="filters.userId ?? all"
      :items="people"
      aria-label="Person"
      class="w-48"
      @update:model-value="(value) => update({ userId: value === all ? undefined : String(value) })"
    />
    <HomeDateRangePicker v-model="range" />
    <UButton
      v-if="filters.from || filters.to"
      label="Any date"
      color="neutral"
      variant="ghost"
      size="sm"
      @click="update({ from: undefined, to: undefined })"
    />
    <USwitch
      :model-value="filters.changesApplied ?? false"
      label="Changes applied"
      @update:model-value="(value) => update({ changesApplied: value || undefined })"
    />
    <USwitch
      :model-value="filters.unanswered ?? false"
      label="Couldn't answer"
      @update:model-value="(value) => update({ unanswered: value || undefined })"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { format, parseISO } from 'date-fns'
import type { Data } from '@generated/data'
import type { Period } from '../../types'
import { orderMoney } from '~/components/seller/orders/presentation'

const props = defineProps<{
  chart: Data.Dashboard.Summary['chart']
  period: Period
  currency: string
}>()

const formatDate = (date: Date): string => {
  return {
    daily: format(date, 'd MMM'),
    weekly: format(date, 'd MMM'),
    monthly: format(date, 'MMM yyy'),
  }[props.period]
}

/** Each bucket with its axis label; `previous` is the same point one range-length earlier. */
const data = computed(() =>
  props.chart.map((bucket) => ({ ...bucket, label: formatDate(parseISO(bucket.date)) }))
)

const categories = [
  { key: 'amount', label: 'This period', color: 'primary' },
  { key: 'previous', label: 'Previous period', color: 'var(--ui-text-dimmed)' },
] as const

const total = computed(() => props.chart.reduce((acc, { amount }) => acc + amount, 0))

const formatNumber = (amount: number) => orderMoney(amount, props.currency)
</script>

<template>
  <UCard>
    <template #header>
      <div>
        <p class="text-xs text-muted uppercase mb-1.5">Gross sales</p>
        <p class="text-3xl text-highlighted font-semibold">
          {{ formatNumber(total) }}
        </p>
      </div>
    </template>

    <UChart
      type="area"
      curve="monotone"
      :data="data"
      index="label"
      :categories="[...categories]"
      :format="formatNumber"
      :height="384"
      :aria-label="`Gross sales by ${period} period, compared with the previous period`"
    />
  </UCard>
</template>

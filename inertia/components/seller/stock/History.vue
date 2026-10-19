<script setup lang="ts">
import { useRouter } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import type { TableColumn } from '@nuxt/ui'
import { stockReasonLabel } from './reasons'
import ViaCopilot from '~/components/copilot/ViaCopilot.vue'
const props = defineProps<{
  productId: string
  variantId: string
  adjustments: {
    data: Data.Seller.StockAdjustment[]
    metadata: { total: number; perPage: number; currentPage: number }
  }
}>()
const router = useRouter()
const date = (value: string | null) =>
  value === null
    ? '—'
    : new Intl.DateTimeFormat('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Manila',
      }).format(new Date(value))
const change = (row: Data.Seller.StockAdjustment) => {
  if (row.change !== null) return row.change > 0 ? `+${row.change}` : `−${Math.abs(row.change)}`
  return row.quantityAfter === null ? 'Tracking off' : 'Tracking on'
}
const columns: TableColumn<Data.Seller.StockAdjustment>[] = [
  { id: 'createdAt', header: 'Date', cell: ({ row }) => date(row.original.createdAt) },
  { id: 'change', header: 'Change' },
  {
    id: 'result',
    header: 'On hand',
    cell: ({ row }) =>
      `${row.original.quantityBefore ?? 'Untracked'} → ${row.original.quantityAfter ?? 'Untracked'}`,
  },
  { id: 'reason', header: 'Reason', cell: ({ row }) => stockReasonLabel(row.original.reason) },
  { id: 'note', header: 'Note' },
  { id: 'actor', header: 'By' },
]
const visit = (page: number) =>
  router.visit(
    {
      route: 'seller.stock_adjustments.index',
      routeParams: { productId: props.productId, variantId: props.variantId },
      qs: { page },
    },
    { only: ['adjustments'], preserveScroll: true, preserveState: true }
  )
</script>

<template>
  <section aria-labelledby="stock-history-title" class="space-y-3">
    <h2 id="stock-history-title" class="text-lg font-semibold text-highlighted">History</h2>
    <UTable
      :data="adjustments.data"
      :columns="columns"
      class="shrink-0"
      :ui="{
        base: 'border-separate border-spacing-0',
        thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
        tbody: '[&>tr]:last:[&>td]:border-b-0',
        th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
        td: 'border-b border-default',
        separator: 'h-0',
      }"
    >
      <template #change-cell="{ row }">
        <span
          class="font-medium tabular-nums"
          :class="(row.original.change ?? 0) < 0 ? 'text-error' : 'text-highlighted'"
          >{{ change(row.original) }}</span
        >
      </template>
      <template #note-cell="{ row }">
        <span class="block max-w-72 whitespace-normal [overflow-wrap:anywhere] text-default">{{
          row.original.note || '—'
        }}</span>
      </template>
      <template #actor-cell="{ row }">
        <span class="inline-flex flex-wrap items-center gap-2">
          {{ row.original.actorName ?? 'Former staff' }}
          <ViaCopilot
            v-if="row.original.viaCopilot"
            :conversation-id="row.original.copilotConversationId"
          />
        </span>
      </template>
      <template #empty>
        <p class="py-8 text-center text-sm text-muted">No stock changes recorded yet.</p>
      </template>
    </UTable>
    <div
      v-if="adjustments.metadata.total > adjustments.metadata.perPage"
      class="flex justify-end border-t border-default pt-4"
    >
      <UPagination
        :page="adjustments.metadata.currentPage"
        :items-per-page="adjustments.metadata.perPage"
        :total="adjustments.metadata.total"
        @update:page="visit"
      />
    </div>
  </section>
</template>

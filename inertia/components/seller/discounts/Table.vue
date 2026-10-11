<script setup lang="ts">
import { computed, h, ref, resolveComponent, useTemplateRef, watch } from 'vue'
import type { Data } from '@generated/data'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import { getPaginationRowModel, type HeaderContext } from '@tanstack/table-core'
import ListEmpty from '~/components/seller/ListEmpty.vue'
const props = defineProps<{ discounts: Data.Seller.Discount[] }>()
const emit = defineEmits<{
  create: []
  edit: [row: Data.Seller.Discount]
  delete: [row: Data.Seller.Discount]
}>()
const title = 'Discounts'
const singular = 'discount'
const description = 'Create codes customers can enter at checkout.'
const filters = [
  { label: 'Active', value: 'active' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Expired', value: 'expired' },
  { label: 'Off', value: 'off' },
]
const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' })
const dateTime = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
const searchText = (row: Data.Seller.Discount) => `${row.code} ${row.description || ''}`
function status(row: Data.Seller.Discount) {
  const now = Date.now()
  if (!row.active) return 'off'
  if (row.endsAt && new Date(row.endsAt).getTime() < now) return 'expired'
  if (row.startsAt && new Date(row.startsAt).getTime() > now) return 'scheduled'
  return 'active'
}
const statusBadges = {
  active: { label: 'Active', color: 'success' },
  scheduled: { label: 'Scheduled', color: 'info' },
  expired: { label: 'Expired', color: 'warning' },
  off: { label: 'Off', color: 'neutral' },
} as const
function discountLabel(row: Data.Seller.Discount) {
  if (row.kind === 'percentage') return `${row.percentOff ?? 0}% off`
  return `${money.format((row.amountOffMinor ?? 0) / 100)} off`
}
const badge = resolveComponent('UBadge')
const resourceColumns: TableColumn<Data.Seller.Discount>[] = [
  {
    id: 'code',
    accessorKey: 'code',
    header: 'Code',
    cell: ({ row }) =>
      h('div', { class: 'min-w-0' }, [
        h('p', { class: 'font-mono font-medium text-highlighted' }, row.original.code),
        row.original.description
          ? h('p', { class: 'text-sm text-muted' }, row.original.description)
          : null,
      ]),
  },
  {
    id: 'discount',
    accessorKey: 'kind',
    header: 'Discount',
    cell: ({ row }) => discountLabel(row.original),
  },
  {
    id: 'minimumSpend',
    accessorKey: 'minimumSubtotalMinor',
    header: 'Minimum spend',
    cell: ({ row }) =>
      row.original.minimumSubtotalMinor > 0
        ? money.format(row.original.minimumSubtotalMinor / 100)
        : '—',
  },
  {
    id: 'uses',
    accessorKey: 'timesUsed',
    header: 'Uses',
    cell: ({ row }) =>
      h('div', [
        h(
          'p',
          row.original.usageLimit === null
            ? `${row.original.timesUsed}`
            : `${row.original.timesUsed} / ${row.original.usageLimit}`
        ),
        row.original.oncePerCustomer
          ? h('p', { class: 'text-sm text-muted' }, 'once per customer')
          : null,
      ]),
  },
  {
    id: 'schedule',
    accessorKey: 'startsAt',
    header: 'Schedule',
    cell: ({ row }) =>
      row.original.startsAt || row.original.endsAt
        ? h('div', { class: 'text-sm' }, [
            row.original.startsAt
              ? h('p', `Starts ${dateTime.format(new Date(row.original.startsAt))}`)
              : null,
            row.original.endsAt
              ? h('p', `Ends ${dateTime.format(new Date(row.original.endsAt))}`)
              : null,
          ])
        : 'Always',
  },
  {
    id: 'status',
    accessorKey: 'active',
    header: 'Status',
    cell: ({ row }) => {
      const item = statusBadges[status(row.original)]
      return h(badge, { label: item.label, color: item.color, variant: 'subtle' })
    },
  },
]
const table = useTemplateRef('table')
const search = ref('')
const statusFilter = ref('all')
const pagination = ref({ pageIndex: 0, pageSize: 10 })
const columnVisibility = ref({})
const rows = computed(() =>
  props.discounts.filter(
    (row) =>
      searchText(row).toLowerCase().includes(search.value.toLowerCase()) &&
      (statusFilter.value === 'all' || status(row) === statusFilter.value)
  )
)
watch([search, statusFilter, () => props.discounts], () => {
  pagination.value.pageIndex = 0
})
function clearFilters() {
  search.value = ''
  statusFilter.value = 'all'
}
const UButton = resolveComponent('UButton')
const columns = computed<TableColumn<Data.Seller.Discount>[]>(() =>
  resourceColumns
    .map((column) => {
      if ('accessorKey' in column && typeof column.header === 'string') {
        const label = column.header
        return {
          ...column,
          header: ({ column: item }: HeaderContext<Data.Seller.Discount, unknown>) =>
            h(UButton, {
              label,
              color: 'neutral',
              variant: 'ghost',
              class: '-mx-2.5',
              icon:
                item.getIsSorted() === 'asc'
                  ? 'i-lucide-arrow-up-narrow-wide'
                  : item.getIsSorted() === 'desc'
                    ? 'i-lucide-arrow-down-wide-narrow'
                    : 'i-lucide-arrow-up-down',
              onClick: () => item.toggleSorting(item.getIsSorted() === 'asc'),
            }),
        }
      }
      return column
    })
    .concat([{ id: 'actions', enableHiding: false }])
)
function rowActions(row: Data.Seller.Discount): DropdownMenuItem[] {
  return [
    { label: 'Edit discount', icon: 'i-lucide-pencil', onSelect: () => emit('edit', row) },
    ...(row.can.delete
      ? [
          {
            label: 'Delete discount',
            icon: 'i-lucide-trash',
            color: 'error' as const,
            onSelect: () => emit('delete', row),
          },
        ]
      : [
          { type: 'separator' as const },
          {
            type: 'label' as const,
            label: "Used codes can't be deleted. Turn the code off instead.",
          },
        ]),
  ]
}
</script>

<template>
  <UDashboardPanel :id="title.toLowerCase()">
    <template #header>
      <UDashboardNavbar :title="title">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right>
          <UButton :label="`Add ${singular}`" icon="i-lucide-plus" @click="emit('create')" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div>
        <p class="text-sm text-muted">{{ description }}</p>
      </div>
      <ListEmpty
        v-if="!discounts.length"
        icon="i-lucide-ticket-percent"
        title="Create your first discount code"
        description="Customers enter a code at checkout to take a percentage or a fixed amount off. You can add a minimum spend, a usage limit, or start and end dates."
        :actions="[
          { label: `Add ${singular}`, icon: 'i-lucide-plus', onClick: () => emit('create') },
        ]"
      />
      <div v-else class="flex flex-wrap items-center justify-between gap-3">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          :placeholder="`Search ${title.toLowerCase()}...`"
          :aria-label="`Search ${title.toLowerCase()}`"
          class="w-full sm:max-w-sm"
        />
        <div class="flex items-center gap-2">
          <USelect
            v-model="statusFilter"
            :items="[{ label: 'All', value: 'all' }, ...filters]"
            aria-label="Filter status"
            class="min-w-36"
          />
          <UDropdownMenu
            :items="
              table?.tableApi
                ?.getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => ({
                  label: column.id
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, (letter) => letter.toUpperCase()),
                  type: 'checkbox' as const,
                  checked: column.getIsVisible(),
                  onUpdateChecked: (checked: boolean) => column.toggleVisibility(checked),
                  onSelect: (event?: Event) => event?.preventDefault(),
                }))
            "
            :content="{ align: 'end' }"
          >
            <UButton
              label="Display"
              color="neutral"
              variant="outline"
              trailing-icon="i-lucide-settings-2"
            />
          </UDropdownMenu>
        </div>
      </div>
      <UTable
        v-if="discounts.length"
        ref="table"
        v-model:pagination="pagination"
        v-model:column-visibility="columnVisibility"
        :data="rows"
        :columns="columns"
        :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
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
        <template #actions-cell="{ row }">
          <UDropdownMenu
            v-if="rowActions(row.original).length"
            :items="rowActions(row.original)"
            :content="{ align: 'end' }"
          >
            <UButton
              icon="i-lucide-ellipsis-vertical"
              color="neutral"
              variant="ghost"
              :aria-label="`Actions for ${searchText(row.original)}`"
            />
          </UDropdownMenu>
        </template>
        <template #empty>
          <ListEmpty filtered :noun="title.toLowerCase()" @clear="clearFilters" />
        </template>
      </UTable>
      <div
        v-if="discounts.length"
        class="flex flex-wrap items-center justify-between gap-3 border-t border-default pt-4 mt-auto"
      >
        <p class="text-sm text-muted">{{ rows.length }} {{ title.toLowerCase() }}</p>
        <UPagination
          :page="pagination.pageIndex + 1"
          :items-per-page="pagination.pageSize"
          :total="rows.length"
          @update:page="table?.tableApi.setPageIndex($event - 1)"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>

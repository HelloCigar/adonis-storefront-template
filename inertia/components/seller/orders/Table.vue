<script setup lang="ts">
import { computed, h, ref, resolveComponent, useTemplateRef, watch } from 'vue'
import type { Data } from '@generated/data'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import { getPaginationRowModel, type HeaderContext } from '@tanstack/table-core'
import { useRouter } from '@adonisjs/inertia/vue'
const router = useRouter()
const props = defineProps<{ orders: Data.Seller.Order[] }>()
const title = 'Orders'
const description = 'Review purchases and manage payment and fulfillment statuses.'
const filters = ['unfulfilled', 'partial', 'fulfilled'].map((value) => ({
  label: value[0].toUpperCase() + value.slice(1),
  value,
}))
const searchText = (row: Data.Seller.Order) => `${row.number} ${row.email}`
const status = (row: Data.Seller.Order) => row.fulfillmentStatus
const badge = resolveComponent('UBadge')
const resourceColumns: TableColumn<Data.Seller.Order>[] = [
  { accessorKey: 'number', header: 'Order' },
  { accessorKey: 'email', header: 'Customer' },
  {
    accessorKey: 'financialStatus',
    header: 'Payment',
    cell: ({ row }) =>
      h(badge, {
        label: row.original.financialStatus.replaceAll('_', ' '),
        color: row.original.financialStatus === 'paid' ? 'success' : 'warning',
        variant: 'subtle',
        class: 'capitalize',
      }),
  },
  {
    accessorKey: 'fulfillmentStatus',
    header: 'Fulfillment',
    cell: ({ row }) =>
      h(badge, {
        label: row.original.fulfillmentStatus,
        color: row.original.fulfillmentStatus === 'fulfilled' ? 'success' : 'neutral',
        variant: 'subtle',
        class: 'capitalize',
      }),
  },
  {
    accessorKey: 'totalAmount',
    header: 'Total',
    cell: ({ row }) =>
      new Intl.NumberFormat('en', {
        style: 'currency',
        currency: row.original.currencyCode,
      }).format(row.original.totalAmount),
  },
  {
    accessorKey: 'processedAt',
    header: 'Date',
    cell: ({ row }) =>
      row.original.processedAt ? new Date(row.original.processedAt).toLocaleDateString() : '—',
  },
]
const table = useTemplateRef('table')
const search = ref('')
const statusFilter = ref('all')
const pagination = ref({ pageIndex: 0, pageSize: 10 })
const columnVisibility = ref({})
const rows = computed(() =>
  props.orders.filter(
    (row) =>
      searchText(row).toLowerCase().includes(search.value.toLowerCase()) &&
      (statusFilter.value === 'all' || status(row) === statusFilter.value)
  )
)
watch([search, statusFilter, () => props.orders], () => {
  pagination.value.pageIndex = 0
})
const UButton = resolveComponent('UButton')
const columns = computed<TableColumn<Data.Seller.Order>[]>(() =>
  resourceColumns
    .map((column) => {
      if ('accessorKey' in column && typeof column.header === 'string') {
        const label = column.header
        return {
          ...column,
          header: ({ column: item }: HeaderContext<Data.Seller.Order, unknown>) =>
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
function rowActions(row: Data.Seller.Order): DropdownMenuItem[] {
  return [
    {
      label: 'View order',
      icon: 'i-lucide-eye',
      onSelect: () =>
        router.visit(
          { route: 'seller.orders.show', routeParams: { id: row.id } },
          { viewTransition: true }
        ),
    },
  ]
}
</script>

<template>
  <UDashboardPanel :id="title.toLowerCase()">
    <template #header>
      <UDashboardNavbar :title="title">
        <template #leading><UDashboardSidebarCollapse /></template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div>
        <p class="text-sm text-muted">{{ description }}</p>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3">
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
          <div class="py-12 text-center">
            <UIcon name="i-lucide-search" class="mx-auto mb-3 block size-8 text-dimmed" />
            <p class="font-medium text-highlighted">No {{ title.toLowerCase() }} found</p>
            <p class="text-sm text-muted mt-1">
              {{
                search || statusFilter !== 'all'
                  ? 'Try changing your search or filters.'
                  : 'Orders will appear here when customers place them.'
              }}
            </p>
          </div>
        </template>
      </UTable>
      <div
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

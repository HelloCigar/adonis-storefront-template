<script setup lang="ts">
import { computed, h, ref, resolveComponent, useTemplateRef, watch } from 'vue'
import type { Data } from '@generated/data'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import { getPaginationRowModel, type HeaderContext } from '@tanstack/table-core'
import { Link } from '@adonisjs/inertia/vue'
const props = defineProps<{ product: Data.Seller.Product }>()
const emit = defineEmits<{
  create: []
  edit: [row: Data.Seller.Variant]
  delete: [row: Data.Seller.Variant]
  images: []
}>()
const title = 'Variants'
const singular = 'variant'
const description = computed(() => `Set prices, options, and stock for ${props.product.title}.`)
const filters = [
  { label: 'Available', value: 'available' },
  { label: 'Unavailable', value: 'unavailable' },
]
const searchText = (row: Data.Seller.Variant) => `${row.title} ${row.sku || ''}`
const status = (row: Data.Seller.Variant) => (row.availableForSale ? 'available' : 'unavailable')
const badge = resolveComponent('UBadge')
const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount)
const resourceColumns: TableColumn<Data.Seller.Variant>[] = [
  { accessorKey: 'title', header: 'Variant' },
  { accessorKey: 'sku', header: 'SKU' },
  {
    accessorKey: 'priceAmount',
    header: 'Price',
    cell: ({ row }) => money(row.original.priceAmount, row.original.currencyCode),
  },
  {
    accessorKey: 'inventoryQuantity',
    header: 'Stock',
    cell: ({ row }) => row.original.inventoryQuantity ?? 'Untracked',
  },
  {
    accessorKey: 'availableForSale',
    header: 'Availability',
    cell: ({ row }) =>
      h(badge, {
        label: row.original.availableForSale ? 'Available' : 'Unavailable',
        color: row.original.availableForSale ? 'success' : 'neutral',
        variant: 'subtle',
      }),
  },
  {
    id: 'options',
    header: 'Options',
    cell: ({ row }) =>
      Object.entries(row.original.options || {})
        .map(([name, value]) => `${name}: ${value}`)
        .join(' · ') || 'Default',
  },
]
const table = useTemplateRef('table')
const search = ref('')
const statusFilter = ref('all')
const pagination = ref({ pageIndex: 0, pageSize: 10 })
const columnVisibility = ref({})
const rows = computed(() =>
  (props.product.variants || []).filter(
    (row) =>
      searchText(row).toLowerCase().includes(search.value.toLowerCase()) &&
      (statusFilter.value === 'all' || status(row) === statusFilter.value)
  )
)
watch([search, statusFilter, () => props.product.variants || []], () => {
  pagination.value.pageIndex = 0
})
const UButton = resolveComponent('UButton')
const columns = computed<TableColumn<Data.Seller.Variant>[]>(() =>
  resourceColumns
    .map((column) => {
      if ('accessorKey' in column && typeof column.header === 'string') {
        const label = column.header
        return {
          ...column,
          header: ({ column: item }: HeaderContext<Data.Seller.Variant, unknown>) =>
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
function rowActions(row: Data.Seller.Variant): DropdownMenuItem[] {
  return [
    { label: 'Edit variant', icon: 'i-lucide-pencil', onSelect: () => emit('edit', row) },
    {
      label: 'Delete variant',
      icon: 'i-lucide-trash',
      color: 'error' as const,
      onSelect: () => emit('delete', row),
    },
  ]
}
</script>

<template>
  <UDashboardPanel :id="title.toLowerCase()">
    <template #header>
      <UDashboardNavbar :title="title">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right>
          <UButton
            label="Images"
            icon="i-lucide-image"
            color="neutral"
            variant="outline"
            @click="emit('images')"
          />
          <UButton :label="`Add ${singular}`" icon="i-lucide-plus" @click="emit('create')" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div>
        <Link
          route="seller.products.index"
          class="inline-flex items-center gap-1 text-sm text-primary mb-3"
          ><UIcon name="i-lucide-arrow-left" class="size-4" />Products</Link
        >
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
            <UIcon name="i-lucide-search" class="size-8 text-dimmed mb-3" />
            <p class="font-medium text-highlighted">No {{ title.toLowerCase() }} found</p>
            <p class="text-sm text-muted mt-1">
              {{
                search || statusFilter !== 'all'
                  ? 'Try changing your search or filters.'
                  : `Add your first ${singular} to get started.`
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

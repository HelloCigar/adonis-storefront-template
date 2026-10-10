<script setup lang="ts">
import { computed, h, ref, resolveComponent, useTemplateRef, watch } from 'vue'
import type { Data } from '@generated/data'
import type { DropdownMenuItem, TableColumn, TableRow } from '@nuxt/ui'
import { getPaginationRowModel, type HeaderContext } from '@tanstack/table-core'
const props = defineProps<{ product: Data.Seller.Product; images: Data.Shared.Media[] }>()
const emit = defineEmits<{
  create: []
  edit: [row: Data.Seller.Variant]
  stock: [row: Data.Seller.Variant]
  delete: [row: Data.Seller.Variant]
  generate: []
}>()
const pageSize = 10
const filters = [
  { label: 'Available', value: 'available' },
  { label: 'Unavailable', value: 'unavailable' },
]
const searchText = (row: Data.Seller.Variant) =>
  `${row.title} ${row.sku || ''} ${Object.values(row.options ?? {}).join(' ')}`.trim()
const status = (row: Data.Seller.Variant) => (row.availableForSale ? 'available' : 'unavailable')
const badge = resolveComponent('UBadge')
const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount)
function stockCell(variant: Data.Seller.Variant) {
  const held = variant.inventoryReservedQuantity
  const heldText = held ? ` · ${held} held` : ''
  if (variant.stockLevel === 'untracked' || variant.inventoryQuantity === null)
    return h('span', { class: 'text-muted' }, 'Not tracked')
  if (variant.stockLevel === 'out')
    return h(badge, { label: `Out of stock${heldText}`, color: 'error', variant: 'subtle' })
  if (variant.stockLevel === 'low')
    return h(badge, {
      label: `${variant.quantityAvailable ?? variant.inventoryQuantity} left${heldText}`,
      color: 'warning',
      variant: 'subtle',
    })
  return h('span', [
    String(variant.quantityAvailable ?? variant.inventoryQuantity),
    held ? h('span', { class: 'ml-1.5 text-muted' }, `${held} held`) : null,
  ])
}
const stockSummary = computed(() => {
  const stock = props.product.stock
  if (!stock || stock.level === 'no_variants') return ''
  if (stock.level === 'untracked') return 'Stock not tracked'
  const parts: string[] = []
  if (stock.available !== null) parts.push(`${stock.available} in stock`)
  if (stock.untracked) parts.push(`${stock.untracked} not tracked`)
  if (stock.outOfStock) parts.push(`${stock.outOfStock} sold out`)
  if (stock.lowStock) parts.push(`${stock.lowStock} running low`)
  return parts.join(' · ')
})
const resourceColumns: TableColumn<Data.Seller.Variant>[] = [
  { id: 'image', header: 'Image', enableHiding: false },
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
    cell: ({ row }) => stockCell(row.original),
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
const imageFor = (variant: Data.Seller.Variant) =>
  props.images.find((image) => image.id === variant.featuredMediaId)
const issuesFor = (variant: Data.Seller.Variant) =>
  props.product.optionIssues.filter((issue) => issue.variantId === variant.id)
const search = ref('')
const statusFilter = ref('all')
const pagination = ref({ pageIndex: 0, pageSize })
const columnVisibility = ref({})
const paged = computed(() => (props.product.variants?.length ?? 0) > pageSize)
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
      label: row.inventoryQuantity === null ? 'Stock history' : 'Adjust stock',
      icon: 'i-lucide-package-plus',
      onSelect: () => emit('stock', row),
    },
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
  <UCard :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="font-semibold text-highlighted">Variants</h2>
          <p v-if="stockSummary" class="mt-1 text-sm text-muted">{{ stockSummary }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <UButton
            label="Generate variants"
            icon="i-lucide-list-plus"
            class="text-highlighted dark:text-inverted"
            @click="emit('generate')"
          />
          <UButton
            label="Add variant"
            icon="i-lucide-plus"
            color="neutral"
            variant="outline"
            :disabled="product.optionDefinitions.length > 3"
            @click="emit('create')"
          />
        </div>
      </div>
    </template>

    <UAlert
      v-if="product.optionIssues.length"
      color="warning"
      title="Some options need attention"
      class="m-4 w-auto"
    >
      <template #description>
        <p class="text-sm">
          Edit the flagged variants to use the shared options and a unique combination. Generation
          is paused until these are resolved.
        </p>
        <p
          v-for="(issue, index) in product.optionIssues.filter((item) => item.variantId === null)"
          :key="index"
          class="mt-2 text-sm"
        >
          {{ issue.message }}
        </p>
      </template>
    </UAlert>

    <div v-if="paged" class="flex flex-wrap items-center justify-between gap-3 p-4">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Search variants..."
        aria-label="Search variants"
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
      :on-select="(_event: Event, row: TableRow<Data.Seller.Variant>) => emit('edit', row.original)"
      class="shrink-0"
      :ui="{
        base: 'border-separate border-spacing-0',
        thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
        tbody: '[&>tr]:last:[&>td]:border-b-0',
        th: 'py-2 border-y border-default',
        td: 'border-b border-default',
        tr: 'data-[selectable=true]:hover:bg-elevated/50 data-[selectable=true]:cursor-pointer',
        separator: 'h-0',
      }"
    >
      <template #image-cell="{ row }">
        <button
          type="button"
          :aria-label="`Assign image for ${row.original.title}`"
          class="flex size-12 items-center justify-center overflow-hidden rounded-md bg-elevated text-muted ring-1 ring-inset ring-default hover:ring-accented focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          @click="emit('edit', row.original)"
        >
          <img
            v-if="imageFor(row.original)"
            :src="imageFor(row.original)!.url"
            alt=""
            class="size-full object-cover"
          />
          <UIcon v-else name="i-lucide-image-plus" class="size-5" />
        </button>
      </template>
      <template #title-cell="{ row }">
        <span class="font-medium text-highlighted">{{ row.original.title }}</span>
        <div
          v-if="issuesFor(row.original).length"
          class="mt-1 max-w-64 whitespace-normal text-xs text-warning"
        >
          <p v-for="(issue, index) in issuesFor(row.original)" :key="index">
            {{ issue.message }}
          </p>
        </div>
      </template>
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
          <template v-if="!product.variants?.length">
            <UIcon name="i-lucide-boxes" class="mx-auto mb-3 block size-8 text-dimmed" />
            <p class="font-medium text-highlighted">No variants yet</p>
            <p class="mx-auto mt-1 max-w-sm text-sm text-muted">
              Generate them from your options, or add one to set a price and stock.
            </p>
          </template>
          <template v-else>
            <UIcon name="i-lucide-search" class="mx-auto mb-3 block size-8 text-dimmed" />
            <p class="font-medium text-highlighted">No variants found</p>
            <p class="mt-1 text-sm text-muted">Try changing your search or filters.</p>
          </template>
        </div>
      </template>
    </UTable>

    <div
      v-if="paged"
      class="flex flex-wrap items-center justify-between gap-3 border-t border-default p-4"
    >
      <p class="text-sm text-muted">{{ rows.length }} variants</p>
      <UPagination
        :page="pagination.pageIndex + 1"
        :items-per-page="pagination.pageSize"
        :total="rows.length"
        @update:page="table?.tableApi.setPageIndex($event - 1)"
      />
    </div>
  </UCard>
</template>

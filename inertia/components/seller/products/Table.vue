<script setup lang="ts">
import { computed, h, onMounted, ref, resolveComponent, useTemplateRef, watch } from 'vue'
import type { Data } from '@generated/data'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import { getPaginationRowModel, type HeaderContext } from '@tanstack/table-core'
import { Link, useRouter } from '@adonisjs/inertia/vue'
import { statusColor, statusLabel, statusOptions } from '~/utils/status'
const router = useRouter()
const props = defineProps<{ products: Data.Seller.Product[] }>()
const emit = defineEmits<{
  create: []
  delete: [row: Data.Seller.Product]
}>()
const title = 'Products'
const singular = 'product'
const description = 'Manage your catalogue, publishing status, and inventory.'
const filters = statusOptions('product')
const searchText = (row: Data.Seller.Product) =>
  `${row.title} ${row.handle} ${row.vendor || ''} ${row.productType || ''}`
const status = (row: Data.Seller.Product) => row.status
const badge = resolveComponent('UBadge')
const stockFilters = [
  { label: 'All stock', value: 'all' },
  { label: 'Needs restock', value: 'restock' },
  { label: 'Out of stock', value: 'out' },
]
const stockMatches: Record<string, string[]> = {
  restock: ['out', 'some_out', 'low'],
  out: ['out', 'some_out'],
}
const resourceColumns: TableColumn<Data.Seller.Product>[] = [
  { accessorKey: 'title', header: 'Product' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) =>
      h(badge, {
        label: statusLabel('product', row.original.status),
        variant: 'subtle',
        color: statusColor('product', row.original.status),
      }),
  },
  { accessorKey: 'vendor', header: 'Vendor' },
  { accessorKey: 'productType', header: 'Type' },
  { id: 'variants', header: 'Variants', cell: ({ row }) => row.original.variants?.length || 0 },
  {
    id: 'stock',
    header: 'Stock',
    accessorFn: (row) => row.stock?.available ?? undefined,
    sortUndefined: 'last',
  },
]
const table = useTemplateRef('table')
const search = ref('')
const statusFilter = ref('all')
const stockFilter = ref('all')
const pagination = ref({ pageIndex: 0, pageSize: 10 })
const columnVisibility = ref({})
const rows = computed(() =>
  props.products.filter(
    (row) =>
      searchText(row).toLowerCase().includes(search.value.toLowerCase()) &&
      (statusFilter.value === 'all' || status(row) === statusFilter.value) &&
      (stockFilter.value === 'all' ||
        stockMatches[stockFilter.value]?.includes(row.stock?.level ?? ''))
  )
)
const isFiltered = computed(
  () => Boolean(search.value) || statusFilter.value !== 'all' || stockFilter.value !== 'all'
)
watch([search, statusFilter, stockFilter, () => props.products], () => {
  pagination.value.pageIndex = 0
})
onMounted(() => {
  const stock = new URL(window.location.href).searchParams.get('stock')
  if (stock === 'out') stockFilter.value = 'out'
  else if (stock === 'low') stockFilter.value = 'restock'
})
const UButton = resolveComponent('UButton')
const columns = computed<TableColumn<Data.Seller.Product>[]>(() =>
  resourceColumns
    .map((column) => {
      if (
        ('accessorKey' in column || 'accessorFn' in column) &&
        typeof column.header === 'string'
      ) {
        const label = column.header
        return {
          ...column,
          header: ({ column: item }: HeaderContext<Data.Seller.Product, unknown>) =>
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
        } as TableColumn<Data.Seller.Product>
      }
      return column
    })
    .concat([{ id: 'actions', enableHiding: false }])
)
function openProduct(row: Data.Seller.Product) {
  router.visit({ route: 'seller.products.show', routeParams: { id: row.id } })
}
function rowActions(row: Data.Seller.Product): DropdownMenuItem[] {
  return [
    { label: 'Open product', icon: 'i-lucide-eye', onSelect: () => openProduct(row) },
    ...(row.status === 'active'
      ? [
          {
            label: 'View in storefront',
            icon: 'i-lucide-external-link',
            onSelect: () =>
              router.visit({ route: 'products.show', routeParams: { handle: row.handle } }),
          },
        ]
      : []),
    {
      label: 'Delete product',
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
          <UButton :label="`Add ${singular}`" icon="i-lucide-plus" @click="emit('create')" />
        </template>
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
          <USelect
            v-model="stockFilter"
            :items="stockFilters"
            aria-label="Filter stock"
            class="min-w-40"
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
        :on-select="(_event, row) => openProduct(row.original)"
        :ui="{
          tr: 'cursor-pointer',
          base: 'border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default',
          separator: 'h-0',
        }"
      >
        <template #title-cell="{ row }">
          <div class="flex items-center gap-3">
            <img
              v-if="row.original.thumbnailUrl"
              :src="row.original.thumbnailUrl"
              alt=""
              loading="lazy"
              class="size-10 shrink-0 rounded-md object-cover ring-1 ring-default"
            />
            <div
              v-else
              class="flex size-10 shrink-0 items-center justify-center rounded-md bg-elevated ring-1 ring-default"
            >
              <UIcon name="i-lucide-image" class="size-5 text-dimmed" aria-hidden="true" />
            </div>
            <div class="min-w-0">
              <Link
                route="seller.products.show"
                :params="{ id: row.original.id }"
                class="block font-medium text-highlighted hover:underline"
                >{{ row.original.title }}</Link
              >
              <p class="text-xs text-muted">{{ row.original.handle }}</p>
            </div>
          </div>
        </template>
        <template #stock-cell="{ row }">
          <UBadge
            v-if="row.original.stock?.level === 'out'"
            label="Out of stock"
            color="error"
            variant="subtle"
          />
          <UBadge
            v-else-if="row.original.stock?.level === 'some_out'"
            :label="`${row.original.stock.outOfStock} of ${row.original.variants?.length ?? 0} sold out`"
            color="warning"
            variant="subtle"
          />
          <div v-else-if="row.original.stock?.level === 'low'" class="flex items-center gap-2">
            <UBadge
              :label="`${row.original.stock.lowStock} running low`"
              color="warning"
              variant="subtle"
            />
            <span class="text-xs text-muted">{{ row.original.stock.available }} in stock</span>
          </div>
          <span v-else-if="row.original.stock?.level === 'in_stock'">
            {{ row.original.stock.available }} in stock
          </span>
          <span v-else-if="row.original.stock?.level === 'untracked'" class="text-muted">
            Not tracked
          </span>
          <span v-else class="text-muted">No variants</span>
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
          <div v-if="!isFiltered && !products.length" class="py-12 text-center">
            <UIcon name="i-lucide-package" class="mx-auto mb-3 block size-8 text-dimmed" />
            <p class="font-medium text-highlighted">No products yet</p>
            <p class="mt-1 text-sm text-muted">
              Add your first product, then give it images and variants.
            </p>
            <UButton
              label="Add your first product"
              icon="i-lucide-plus"
              class="mt-4"
              @click="emit('create')"
            />
          </div>
          <div v-else class="py-12 text-center">
            <UIcon name="i-lucide-search" class="mx-auto mb-3 block size-8 text-dimmed" />
            <p class="font-medium text-highlighted">No {{ title.toLowerCase() }} found</p>
            <p class="mt-1 text-sm text-muted">Try changing your search or filters.</p>
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

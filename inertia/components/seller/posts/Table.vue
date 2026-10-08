<script setup lang="ts">
import { computed, h, ref, resolveComponent, useTemplateRef, watch } from 'vue'
import type { Data } from '@generated/data'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import { getPaginationRowModel, type HeaderContext } from '@tanstack/table-core'
import { urlFor } from '~/client'
const props = defineProps<{ posts: Data.Seller.Post[] }>()
const emit = defineEmits<{ delete: [row: Data.Seller.Post] }>()
const title = 'Blog'
const noun = 'posts'
const singular = 'post'
const description = 'Write and publish articles for the storefront blog.'
const filters = [
  { label: 'Draft', value: 'draft' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Published', value: 'published' },
]
const dateTime = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
const searchText = (row: Data.Seller.Post) => row.title
function status(row: Data.Seller.Post) {
  if (row.status !== 'published') return 'draft'
  if (row.publishedAt && new Date(row.publishedAt).getTime() > Date.now()) return 'scheduled'
  return 'published'
}
const statusBadges = {
  draft: { label: 'Draft', color: 'neutral' },
  scheduled: { label: 'Scheduled', color: 'warning' },
  published: { label: 'Published', color: 'success' },
} as const
function formatDate(value: string | null) {
  return value ? dateTime.format(new Date(value)) : '—'
}
const badge = resolveComponent('UBadge')
const resourceColumns: TableColumn<Data.Seller.Post>[] = [
  {
    id: 'title',
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) =>
      h('div', { class: 'min-w-0' }, [
        h('p', { class: 'font-medium text-highlighted' }, row.original.title),
        h('p', { class: 'text-sm text-muted' }, row.original.handle),
      ]),
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const item = statusBadges[status(row.original)]
      return h(badge, { label: item.label, color: item.color, variant: 'subtle' })
    },
  },
  {
    id: 'published',
    accessorKey: 'publishedAt',
    header: 'Published',
    cell: ({ row }) => formatDate(row.original.publishedAt),
  },
  {
    id: 'author',
    accessorKey: 'authorName',
    header: 'Author',
    cell: ({ row }) => row.original.authorName || '—',
  },
  {
    id: 'updated',
    accessorKey: 'updatedAt',
    header: 'Updated',
    cell: ({ row }) => formatDate(row.original.updatedAt),
  },
]
const table = useTemplateRef('table')
const search = ref('')
const statusFilter = ref('all')
const pagination = ref({ pageIndex: 0, pageSize: 10 })
const columnVisibility = ref({})
const rows = computed(() =>
  props.posts.filter(
    (row) =>
      searchText(row).toLowerCase().includes(search.value.toLowerCase()) &&
      (statusFilter.value === 'all' || status(row) === statusFilter.value)
  )
)
watch([search, statusFilter, () => props.posts], () => {
  pagination.value.pageIndex = 0
})
const UButton = resolveComponent('UButton')
const columns = computed<TableColumn<Data.Seller.Post>[]>(() =>
  resourceColumns
    .map((column) => {
      if ('accessorKey' in column && typeof column.header === 'string') {
        const label = column.header
        return {
          ...column,
          header: ({ column: item }: HeaderContext<Data.Seller.Post, unknown>) =>
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
function rowActions(row: Data.Seller.Post): DropdownMenuItem[] {
  return [
    {
      label: 'Edit post',
      icon: 'i-lucide-pencil',
      to: urlFor('seller.posts.edit', { id: row.id }),
    },
    {
      label: 'Delete post',
      icon: 'i-lucide-trash',
      color: 'error' as const,
      onSelect: () => emit('delete', row),
    },
  ]
}
</script>

<template>
  <UDashboardPanel :id="noun">
    <template #header>
      <UDashboardNavbar :title="title">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right>
          <UButton label="New post" icon="i-lucide-plus" :to="urlFor('seller.posts.create')" />
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
          :placeholder="`Search ${noun}...`"
          :aria-label="`Search ${noun}`"
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
          <UDropdownMenu :items="rowActions(row.original)" :content="{ align: 'end' }">
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
            <p class="font-medium text-highlighted">No {{ noun }} found</p>
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
        <p class="text-sm text-muted">
          {{ rows.length }} {{ rows.length === 1 ? singular : noun }}
        </p>
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

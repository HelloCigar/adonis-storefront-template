<script setup lang="ts">
import { computed, h, nextTick, onMounted, ref, resolveComponent, useTemplateRef, watch } from 'vue'
import { router as inertia } from '@inertiajs/vue3'
import type { Data } from '@generated/data'
import type { TabsItem, TableColumn } from '@nuxt/ui'
import { getPaginationRowModel, type HeaderContext, type SortingState } from '@tanstack/table-core'
import { Link, useRouter } from '@adonisjs/inertia/vue'
import { urlFor } from '~/client'
import NextStep from '~/components/seller/orders/NextStep.vue'
import { statusColor, statusLabel } from '~/utils/status'

type Row = Data.Seller.OrderQueueItem
type Stage = Row['stages'][number]
type StageFilter = Stage | 'all'

const router = useRouter()
const props = defineProps<{ orders: Row[]; stage: StageFilter }>()

const title = 'Orders'
const description = 'Work through orders from packing to delivery.'

const tabs: { value: StageFilter; label: string }[] = [
  ...(['to_pack', 'to_ship', 'in_transit', 'delivered', 'needs_attention'] as const).map(
    (value) => ({ value, label: statusLabel('stage', value) })
  ),
  { value: 'all', label: 'All' },
]

const empties: Record<StageFilter, { icon: string; title: string; hint?: string }> = {
  to_pack: {
    icon: 'i-lucide-package-open',
    title: 'Nothing to pack',
    hint: 'Paid orders appear here until they are packed.',
  },
  to_ship: {
    icon: 'i-lucide-truck',
    title: 'Nothing to ship',
    hint: 'Packed orders appear here until tracking is added.',
  },
  in_transit: {
    icon: 'i-lucide-route',
    title: 'Nothing in transit',
    hint: 'Shipped orders appear here until delivery is confirmed.',
  },
  delivered: { icon: 'i-lucide-package-check', title: 'No delivered orders yet' },
  needs_attention: {
    icon: 'i-lucide-circle-check',
    title: 'Nothing needs attention',
    hint: 'Orders with a payment or refund to review appear here.',
  },
  all: {
    icon: 'i-lucide-shopping-bag',
    title: 'No orders yet',
    hint: 'Orders will appear here when customers place them.',
  },
}

// Stages where the oldest waiting order should come first.
const oldestFirst: StageFilter[] = ['to_pack', 'to_ship', 'in_transit', 'needs_attention']

const counts = computed(
  () =>
    Object.fromEntries(
      tabs.map(({ value }) => [
        value,
        value === 'all'
          ? props.orders.length
          : props.orders.filter((order) => order.stages.includes(value)).length,
      ])
    ) as Record<StageFilter, number>
)

const tabItems = computed<TabsItem[]>(() =>
  tabs.map(({ value, label }) => ({
    label,
    value,
    badge: {
      label: counts.value[value],
      color: value === 'needs_attention' && counts.value[value] > 0 ? 'warning' : 'neutral',
      variant: 'subtle',
      size: 'sm',
    },
  }))
)

const selectedTab = computed({
  get: () => props.stage,
  set: (value: StageFilter) => {
    if (value === props.stage) return
    // Switch tabs on the client: the page already holds every order.
    inertia.replace({
      url: urlFor('seller.orders.index', {}, { qs: { stage: value } }),
      props: (current) => ({ ...current, stage: value }),
      preserveState: true,
      preserveScroll: true,
    })
  },
})

const search = ref('')
const sorting = ref<SortingState>([])
const pagination = ref({ pageIndex: 0, pageSize: 10 })
const columnVisibility = ref({ fulfillmentStatus: false })

const matches = (row: Row, query: string) =>
  `${row.number} ${row.email} ${row.customer ?? ''}`.toLowerCase().includes(query)

const rows = computed(() => {
  const query = search.value.trim().toLowerCase()
  const inStage = props.orders.filter(
    (row) => props.stage === 'all' || row.stages.includes(props.stage as Stage)
  )
  const found = query ? inStage.filter((row) => matches(row, query)) : inStage
  if (!oldestFirst.includes(props.stage)) return found
  // Oldest waiting first; orders nobody is waiting on go last.
  return [...found].sort((a, b) => {
    if (a.waitingSince === b.waitingSince) return 0
    if (!a.waitingSince) return 1
    if (!b.waitingSince) return -1
    return a.waitingSince < b.waitingSince ? -1 : 1
  })
})

watch([search, () => props.stage, () => props.orders], () => {
  pagination.value.pageIndex = 0
})
watch(
  () => props.stage,
  () => {
    sorting.value = []
  }
)

const empty = computed(() => empties[props.stage])
const searching = computed(() => search.value.trim().length > 0)

function showAll() {
  selectedTab.value = 'all'
}

function open(event: Event, row: { original: Row }) {
  const params = { id: row.original.id }
  if (event instanceof MouseEvent && (event.metaKey || event.ctrlKey)) {
    window.open(urlFor('seller.orders.show', params), '_blank')
    return
  }
  router.visit({ route: 'seller.orders.show', routeParams: params })
}

const badge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

function sortable(label: string) {
  return ({ column }: HeaderContext<Row, unknown>) =>
    h(UButton, {
      label,
      color: 'neutral',
      variant: 'ghost',
      class: '-mx-2.5',
      icon:
        column.getIsSorted() === 'asc'
          ? 'i-lucide-arrow-up-narrow-wide'
          : column.getIsSorted() === 'desc'
            ? 'i-lucide-arrow-down-wide-narrow'
            : 'i-lucide-arrow-up-down',
      onClick: () => column.toggleSorting(column.getIsSorted() === 'asc'),
    })
}

const columnLabels: Record<string, string> = {
  fulfillmentStatus: 'Fulfillment',
}

const columns: TableColumn<Row>[] = [
  { id: 'number', accessorKey: 'number', header: sortable('Order') },
  { id: 'nextStep', header: 'Next step', enableSorting: false },
  {
    id: 'customer',
    accessorFn: (row) => row.customer ?? row.email,
    header: sortable('Customer'),
  },
  {
    accessorKey: 'financialStatus',
    header: sortable('Payment'),
    cell: ({ row }) =>
      h(badge, {
        label: statusLabel('payment', row.original.financialStatus),
        color: statusColor('payment', row.original.financialStatus),
        variant: 'subtle',
      }),
  },
  {
    accessorKey: 'fulfillmentStatus',
    header: sortable('Fulfillment'),
    cell: ({ row }) =>
      h(badge, {
        label: statusLabel('fulfillment', row.original.fulfillmentStatus),
        color: statusColor('fulfillment', row.original.fulfillmentStatus),
        variant: 'subtle',
      }),
  },
  {
    accessorKey: 'totalAmount',
    header: sortable('Total'),
    cell: ({ row }) =>
      new Intl.NumberFormat('en', {
        style: 'currency',
        currency: row.original.currencyCode,
      }).format(row.original.totalAmount),
  },
  {
    accessorKey: 'processedAt',
    header: sortable('Date'),
    cell: ({ row }) =>
      row.original.processedAt ? new Date(row.original.processedAt).toLocaleDateString() : '—',
  },
]

const table = useTemplateRef('table')
const tabStrip = useTemplateRef('tabStrip')

// On narrow screens the strip scrolls; keep the selected tab in view, e.g. when a link opens All.
function revealSelectedTab() {
  void nextTick(() =>
    tabStrip.value
      ?.querySelector('[role="tab"][data-state="active"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' })
  )
}
onMounted(revealSelectedTab)
watch(() => props.stage, revealSelectedTab)

function columnLabel(id: string) {
  return (
    columnLabels[id] ??
    id.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())
  )
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
      <div ref="tabStrip" class="max-w-full shrink-0 overflow-x-auto pb-px">
        <UTabs
          v-model="selectedTab"
          :items="tabItems"
          :content="false"
          variant="link"
          aria-label="Order stage"
          :ui="{
            root: 'w-max min-w-full',
            list: 'w-max min-w-full border-b border-default',
            indicator: 'h-0.5',
            trigger: 'grow-0 shrink-0',
          }"
        />
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Search orders..."
          aria-label="Search orders"
          class="w-full sm:max-w-sm"
        />
        <UDropdownMenu
          :items="
            table?.tableApi
              ?.getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => ({
                label: columnLabel(column.id),
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
      <UTable
        ref="table"
        v-model:pagination="pagination"
        v-model:column-visibility="columnVisibility"
        v-model:sorting="sorting"
        :data="rows"
        :columns="columns"
        :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
        class="shrink-0"
        :ui="{
          base: 'border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          tr: 'cursor-pointer hover:bg-elevated/50',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default',
          separator: 'h-0',
        }"
        @select="open"
      >
        <template #number-cell="{ row }">
          <Link
            route="seller.orders.show"
            :params="{ id: row.original.id }"
            class="font-medium text-highlighted hover:underline"
            @click.stop
            >{{ row.original.number }}</Link
          >
        </template>
        <template #customer-cell="{ row }">
          <div class="min-w-0">
            <p v-if="row.original.customer" class="truncate text-highlighted">
              {{ row.original.customer }}
            </p>
            <p
              class="truncate"
              :class="row.original.customer ? 'text-xs text-muted' : 'text-highlighted'"
            >
              {{ row.original.email }}
            </p>
          </div>
        </template>
        <template #nextStep-cell="{ row }">
          <NextStep :step="row.original.nextStep" :waiting-since="row.original.waitingSince" />
        </template>
        <template #empty>
          <div v-if="searching" class="py-12 text-center">
            <UIcon name="i-lucide-search" class="mx-auto mb-3 block size-8 text-dimmed" />
            <p class="font-medium text-highlighted">No orders match “{{ search.trim() }}”</p>
            <p class="mt-1 text-sm text-muted">Check the order number or email and try again.</p>
            <UButton
              v-if="stage !== 'all'"
              label="Search all orders"
              color="neutral"
              variant="outline"
              class="mt-4"
              @click="showAll"
            />
          </div>
          <div v-else class="py-12 text-center">
            <UIcon :name="empty.icon" class="mx-auto mb-3 block size-8 text-dimmed" />
            <p class="font-medium text-highlighted">{{ empty.title }}</p>
            <p v-if="empty.hint" class="mt-1 text-sm text-muted">{{ empty.hint }}</p>
          </div>
        </template>
      </UTable>
      <div
        class="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-default pt-4"
      >
        <p class="text-sm text-muted">
          {{ rows.length }} {{ rows.length === 1 ? 'order' : 'orders' }}
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

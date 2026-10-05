<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { format, parseISO } from 'date-fns'
import type { DropdownMenuItem } from '@nuxt/ui'
import { useRouter } from '@adonisjs/inertia/vue'
import type { Data } from '@generated/data'
import { useDashboard } from '../composables/useDashboard'
import type { Period, Range } from '../types'
import { urlFor } from '~/client'
import Default from '~/layouts/admin.vue'

const props = defineProps<{ summary: Data.Dashboard.Summary }>()

const { isNotificationsSlideoverOpen } = useDashboard()

const page = usePage()
const router = useRouter()
const loading = ref(false)

const items = computed(
  () =>
    [
      page.props.permissions.manageUsers
        ? [{ label: 'Manage users', icon: 'i-lucide-user-plus', to: urlFor('seller.users.index') }]
        : [],
    ] satisfies DropdownMenuItem[][]
)

const day = (date: Date) => format(date, 'yyyy-MM-dd')

const load = (query: { start: string; end: string; period: Period }) =>
  router.visit(
    { route: 'dashboard', qs: query },
    {
      only: ['summary'],
      preserveState: true,
      preserveScroll: true,
      replace: true,
      onStart: () => {
        loading.value = true
      },
      onFinish: () => {
        loading.value = false
      },
    }
  )

const range = computed<Range>({
  get: () => ({
    start: parseISO(props.summary.query.start),
    end: parseISO(props.summary.query.end),
  }),
  set: (value) =>
    load({ start: day(value.start), end: day(value.end), period: props.summary.query.period }),
})

const period = computed<Period>({
  get: () => props.summary.query.period,
  set: (value) =>
    load({ start: props.summary.query.start, end: props.summary.query.end, period: value }),
})
</script>

<template>
  <Default>
    <UDashboardPanel id="home">
      <template #header>
        <UDashboardNavbar title="Home" :ui="{ right: 'gap-3' }">
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>

          <template #right>
            <UTooltip text="Notifications" :shortcuts="['N']">
              <UButton
                color="neutral"
                variant="ghost"
                square
                icon="i-lucide-bell"
                aria-label="Notifications"
                @click="isNotificationsSlideoverOpen = true"
              />
            </UTooltip>

            <UDropdownMenu v-if="items[0].length" :items="items">
              <UButton icon="i-lucide-plus" size="md" class="rounded-full" aria-label="Create" />
            </UDropdownMenu>
          </template>
        </UDashboardNavbar>

        <UDashboardToolbar>
          <template #left>
            <!-- NOTE: The `-ms-1` class is used to align with the `DashboardSidebarCollapse` button here. -->
            <HomeDateRangePicker v-model="range" class="-ms-1" />

            <HomePeriodSelect v-model="period" :periods="summary.query.periods" />
          </template>
        </UDashboardToolbar>
      </template>

      <template #body>
        <div
          class="flex flex-col gap-4 sm:gap-6"
          :class="{ 'opacity-60': loading }"
          :aria-busy="loading"
        >
          <HomeStats :stats="summary.stats" :currency="summary.currency" />
          <HomeChart
            :chart="summary.chart"
            :period="summary.query.period"
            :currency="summary.currency"
          />
          <HomeSales :orders="summary.recentOrders" />
        </div>
      </template>
    </UDashboardPanel>
  </Default>
</template>

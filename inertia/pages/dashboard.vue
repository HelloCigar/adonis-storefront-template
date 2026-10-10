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
import HomeAttention from '~/components/home/HomeAttention.vue'

const props = defineProps<{
  summary: Data.Dashboard.Summary
  attention: Data.Dashboard.Attention
}>()

const { isNotificationsSlideoverOpen } = useDashboard()

const page = usePage()
const router = useRouter()
const loading = ref(false)

/** Shortcuts to start common store work; the target pages open their create dialog for `new=1`. */
const items = computed(() => {
  const { manageStore, manageUsers } = page.props.permissions
  return [
    manageStore
      ? [
          {
            label: 'New product',
            icon: 'i-lucide-package-plus',
            to: urlFor('seller.products.index', {}, { qs: { new: 1 } }),
          },
          {
            label: 'New discount',
            icon: 'i-lucide-ticket-percent',
            to: urlFor('seller.discounts.index', {}, { qs: { new: 1 } }),
          },
          {
            label: 'New blog post',
            icon: 'i-lucide-newspaper',
            to: urlFor('seller.posts.create'),
          },
        ]
      : [],
    manageUsers
      ? [{ label: 'Manage users', icon: 'i-lucide-user-plus', to: urlFor('seller.users.index') }]
      : [],
  ].filter((group) => group.length > 0) satisfies DropdownMenuItem[][]
})

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

            <UDropdownMenu v-if="items.length" :items="items">
              <UButton
                icon="i-lucide-plus"
                size="md"
                class="rounded-full"
                aria-label="Create new"
              />
            </UDropdownMenu>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="flex flex-col gap-8">
          <HomeAttention :attention="attention" />

          <section aria-labelledby="home-sales-title" class="flex flex-col gap-4">
            <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <h2 id="home-sales-title" class="text-base font-semibold text-highlighted">Sales</h2>

              <div class="flex flex-wrap items-center gap-2">
                <HomeDateRangePicker v-model="range" />
                <HomePeriodSelect v-model="period" :periods="summary.query.periods" />
              </div>
            </div>

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
          </section>
        </div>
      </template>
    </UDashboardPanel>
  </Default>
</template>

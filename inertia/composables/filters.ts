import { computed } from 'vue'
import { usePage, router } from '@inertiajs/vue3'
import type { ProductFilter } from '~/types/store'
import { queryToFilters, filtersToQuery } from '~/utils/query'

export const useFilters = (name?: keyof ProductFilter) => {
  const page = usePage()
  const filters = computed(() => queryToFilters(new URLSearchParams(page.url.split('?')[1])))
  const get = () => filters.value.filter((filter) => !name || filter[name] !== undefined)
  const set = (values: ProductFilter[]) => {
    const combined = name
      ? [...filters.value.filter((filter) => filter[name] === undefined), ...values]
      : values
    router.get(
      page.url.split('?')[0]! + '?' + filtersToQuery(combined),
      {},
      {
        preserveState: true,
        preserveScroll: true,
        replace: true,
      }
    )
  }
  return { filters, get, set }
}

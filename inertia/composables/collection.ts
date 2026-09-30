import { computed } from 'vue'
import { usePage } from '@inertiajs/vue3'
import { useFilters } from './filters'

export const useCollection = () => {
  const page = usePage()
  const { filters } = useFilters()
  const params = computed(() => {
    const query = new URLSearchParams(page.url.split('?')[1])
    return { page: Number(query.get('page') ?? 1), perPage: 12, filters: filters.value }
  })
  return { params, filters }
}

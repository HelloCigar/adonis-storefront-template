import type { ProductFilter } from '~/types/store'

export const queryToFilters = (query: URLSearchParams) =>
  [...query.entries()]
    .filter(([key]) => key.startsWith('filter.'))
    .flatMap(([key, value]) => {
      try {
        return [{ [key.slice(7)]: JSON.parse(value) } as ProductFilter]
      } catch {
        return []
      }
    })

export const filtersToQuery = (filters: ProductFilter[]) => {
  const query = new URLSearchParams()
  for (const filter of filters) {
    for (const [key, value] of Object.entries(filter)) {
      query.append('filter.' + key, JSON.stringify(value))
    }
  }
  return query
}

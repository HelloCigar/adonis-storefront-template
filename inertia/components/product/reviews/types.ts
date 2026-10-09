export type ReviewSummary = {
  average: number | null
  count: number
  distribution: Record<1 | 2 | 3 | 4 | 5, number>
}

export type ReviewPagination = {
  total: number
  perPage: number
  currentPage: number
}

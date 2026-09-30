export type StoreContent = {
  id: string
  handle: string
  title: string
  body?: string
  bodySummary?: string
  contentHtml?: string
  excerpt?: string
  publishedAt?: string
  seo?: { title?: string; description?: string }
}

// Trusted, authored HTML only. No extra CMS tables or external commerce provider.
export default {
  pages: [] as StoreContent[],
  policies: [] as StoreContent[],
  blogs: [] as Array<StoreContent & { articles: StoreContent[] }>,
}

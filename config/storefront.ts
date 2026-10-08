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

// Trusted, authored HTML only. Blog posts live in the blog_posts table.
export default {
  pages: [] as StoreContent[],
  policies: [] as StoreContent[],
}

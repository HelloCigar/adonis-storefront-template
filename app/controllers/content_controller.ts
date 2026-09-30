import storefront from '#config/storefront'
import ContentTransformer from '#transformers/content_transformer'
import type { HttpContext } from '@adonisjs/core/http'

export default class ContentController {
  async page({ params, inertia, response }: HttpContext) {
    const page = storefront.pages.find((item) => item.handle === params.handle)
    if (!page) return response.notFound()
    return inertia.render('pages/[handle]', { page: ContentTransformer.transform(page) })
  }
  async policies({ inertia }: HttpContext) {
    return inertia.render('policies/index', {
      policies: ContentTransformer.transform(storefront.policies),
    })
  }
  async policy({ params, inertia, response }: HttpContext) {
    const policy = storefront.policies.find((item) => item.handle === params.handle)
    if (!policy) return response.notFound()
    return inertia.render('policies/[handle]', { policy: ContentTransformer.transform(policy) })
  }
  async blog({ params, inertia, response }: HttpContext) {
    const blog = storefront.blogs.find((item) => item.handle === params.handle)
    if (!blog) return response.notFound()
    return inertia.render('blog/[handle]/index', {
      blog: ContentTransformer.transform(blog),
      articles: ContentTransformer.transform(blog.articles),
    })
  }
  async article({ params, inertia, response }: HttpContext) {
    const blog = storefront.blogs.find((item) => item.handle === params.handle)
    const article = blog?.articles.find((item) => item.handle === params.article)
    if (!blog || !article) return response.notFound()
    return inertia.render('blog/[handle]/[article]', {
      blog: ContentTransformer.transform(blog),
      articleData: ContentTransformer.transform(article),
    })
  }
}

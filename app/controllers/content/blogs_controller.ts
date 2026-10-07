import { inject } from '@adonisjs/core'
import ContentService from '#services/content/content_service'
import ContentTransformer from '#transformers/content/content_transformer'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class BlogsController {
  constructor(private contentService: ContentService) {}

  show({ params, inertia }: HttpContext) {
    const blog = this.contentService.findBlogOrFail(params.handle)
    return inertia.render('blog/[handle]/index', {
      blog: ContentTransformer.transform(blog),
      articles: ContentTransformer.transform(blog.articles),
    })
  }
}

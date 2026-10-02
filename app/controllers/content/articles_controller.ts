import { inject } from '@adonisjs/core'
import ContentService from '#services/content/content_service'
import ContentTransformer from '#transformers/content/content_transformer'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class ArticlesController {
  constructor(private contentService: ContentService) {}

  show({ params, inertia, response }: HttpContext) {
    const content = this.contentService.findArticle(params.handle, params.article)
    if (!content) return response.notFound()
    return inertia.render('blog/[handle]/[article]', {
      blog: ContentTransformer.transform(content.blog),
      articleData: ContentTransformer.transform(content.article),
    })
  }
}

import { inject } from '@adonisjs/core'
import ContentService from '#services/content/content_service'
import ContentTransformer from '#transformers/content/content_transformer'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class PagesController {
  constructor(private contentService: ContentService) {}

  show({ params, inertia, response }: HttpContext) {
    const page = this.contentService.findPage(params.handle)
    if (!page) return response.notFound()
    return inertia.render('pages/[handle]', { page: ContentTransformer.transform(page) })
  }
}

import { inject } from '@adonisjs/core'
import ContentService from '#services/content_service'
import ContentTransformer from '#transformers/content_transformer'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class PoliciesController {
  constructor(private contentService: ContentService) {}

  index({ inertia }: HttpContext) {
    return inertia.render('policies/index', {
      policies: ContentTransformer.transform(this.contentService.policies()),
    })
  }

  show({ params, inertia, response }: HttpContext) {
    const policy = this.contentService.findPolicy(params.handle)
    if (!policy) return response.notFound()
    return inertia.render('policies/[handle]', { policy: ContentTransformer.transform(policy) })
  }
}

import { inject } from '@adonisjs/core'
import ContentService from '#services/content/content_service'
import ContentTransformer from '#transformers/content/content_transformer'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class PoliciesController {
  constructor(private contentService: ContentService) {}

  async index({ inertia }: HttpContext) {
    return inertia.render('policies/index', {
      policies: ContentTransformer.transform(await this.contentService.policies()),
    })
  }

  async show({ params, inertia }: HttpContext) {
    const policy = await this.contentService.findPolicyOrFail(params.handle)
    return inertia.render('policies/[handle]', { policy: ContentTransformer.transform(policy) })
  }
}

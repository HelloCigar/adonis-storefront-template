import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import AttentionService from '#services/dashboard/attention_service'
import SummaryService from '#services/dashboard/summary_service'
import AttentionTransformer from '#transformers/dashboard/attention_transformer'
import SummaryTransformer from '#transformers/dashboard/summary_transformer'
import { dashboardQueryValidator } from '#validators/dashboard/summary'

@inject()
export default class DashboardController {
  constructor(
    private summaries: SummaryService,
    private attention: AttentionService
  ) {}

  async index({ inertia, request }: HttpContext) {
    const query = await request.validateUsing(dashboardQueryValidator)
    return inertia.render('dashboard', {
      summary: async () => SummaryTransformer.transform(await this.summaries.summarize(query)),
      attention: async () => AttentionTransformer.transform(await this.attention.summarize()),
    })
  }
}

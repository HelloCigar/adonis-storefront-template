import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import SummaryService from '#services/dashboard/summary_service'
import SummaryTransformer from '#transformers/dashboard/summary_transformer'
import { dashboardQueryValidator } from '#validators/dashboard/summary'

@inject()
export default class DashboardController {
  constructor(private summaries: SummaryService) {}

  async index({ inertia, request }: HttpContext) {
    const query = await request.validateUsing(dashboardQueryValidator)
    return inertia.render('dashboard', {
      summary: async () => SummaryTransformer.transform(await this.summaries.summarize(query)),
    })
  }
}

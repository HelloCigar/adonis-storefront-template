import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import AttentionService from '#services/dashboard/attention_service'
import SummaryService from '#services/dashboard/summary_service'
import AttentionTransformer from '#transformers/dashboard/attention_transformer'
import SummaryTransformer from '#transformers/dashboard/summary_transformer'
import { dashboardQueryValidator } from '#validators/dashboard/summary'
import StoreSetting from '#models/settings/store_setting'
import StoreSettingPolicy from '#policies/settings/store_setting_policy'
import StoreSetupTransformer from '#transformers/settings/store_setup_transformer'
import LaunchChecklistService from '#services/settings/launch_checklist_service'

@inject()
export default class DashboardController {
  constructor(
    private summaries: SummaryService,
    private attention: AttentionService,
    private launchChecklist: LaunchChecklistService
  ) {}

  async index({ inertia, request, bouncer }: HttpContext) {
    const query = await request.validateUsing(dashboardQueryValidator)
    return inertia.render('dashboard', {
      summary: async () => SummaryTransformer.transform(await this.summaries.summarize(query)),
      attention: async () => AttentionTransformer.transform(await this.attention.summarize()),
      storeSetup: async () => {
        if (!(await bouncer.with(StoreSettingPolicy).allows('viewChecklist'))) return null
        const settings = await StoreSetting.current()
        // Stamps newly met launch tasks before the checklist decides whether to show.
        const checklist = await this.launchChecklist.review(settings)
        return StoreSetupTransformer.transform({ settings, checklist })
      },
    })
  }
}

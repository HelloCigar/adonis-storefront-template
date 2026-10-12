import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import StoreSettingPolicy from '#policies/settings/store_setting_policy'
import ContentService from '#services/content/content_service'
import { storePoliciesValidator } from '#validators/settings/store_policy'

@inject()
export default class StorePoliciesController {
  constructor(private content: ContentService) {}

  async edit({ inertia, bouncer }: HttpContext) {
    await bouncer.with(StoreSettingPolicy).authorize('updatePolicies')
    return inertia.render('settings/store_policies', {
      editablePolicies: await this.content.editablePolicies(),
    })
  }

  async update({ request, response, session, bouncer }: HttpContext) {
    await bouncer.with(StoreSettingPolicy).authorize('updatePolicies')
    const { policies } = await request.validateUsing(storePoliciesValidator)
    await this.content.savePolicies(policies)
    session.flash('success', 'Policies saved.')
    return response.redirect().toRoute('settings.store_policies.edit')
  }
}

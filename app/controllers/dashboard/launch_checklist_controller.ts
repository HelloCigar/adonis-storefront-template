import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import StoreSetting from '#models/settings/store_setting'
import StoreSettingPolicy from '#policies/settings/store_setting_policy'

export default class LaunchChecklistController {
  /** Hides the launch checklist for every admin. */
  async destroy({ response, bouncer }: HttpContext) {
    await bouncer.with(StoreSettingPolicy).authorize('dismissChecklist')
    const settings = await StoreSetting.current()
    if (!settings.checklistDismissedAt) {
      settings.checklistDismissedAt = DateTime.utc()
      await settings.save()
    }
    return response.redirect().toRoute('dashboard')
  }
}

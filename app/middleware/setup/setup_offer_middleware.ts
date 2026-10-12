import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import StoreSetting from '#models/settings/store_setting'
import StoreSettingPolicy from '#policies/settings/store_setting_policy'

/**
 * Sends an admin to store setup on their first dashboard visit of the session while setup is
 * unfinished. Later visits reach the dashboard, which keeps a prompt to resume.
 */
export default class SetupOfferMiddleware {
  async handle({ bouncer, session, response }: HttpContext, next: NextFn) {
    if (
      !session.get('storeSetupOffered') &&
      (await bouncer.with(StoreSettingPolicy).allows('viewChecklist'))
    ) {
      const settings = await StoreSetting.current()
      if (!settings.setupFinished) {
        session.put('storeSetupOffered', true)
        return response.redirect().toRoute('setup.index')
      }
    }
    return next()
  }
}

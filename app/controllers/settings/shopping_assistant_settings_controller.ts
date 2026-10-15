import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { errors } from '@vinejs/vine'
import AssistantModelProvider from '#assistant/model_provider'
import StoreSetting from '#models/settings/store_setting'
import StoreSettingPolicy from '#policies/settings/store_setting_policy'
import { updateShoppingAssistantSettingValidator } from '#validators/settings/shopping_assistant_setting'

export default class ShoppingAssistantSettingsController {
  @inject()
  async update(
    { request, response, session, bouncer }: HttpContext,
    provider: AssistantModelProvider
  ) {
    await bouncer.with(StoreSettingPolicy).authorize('updateShoppingAssistant')
    const { enabled } = await request.validateUsing(updateShoppingAssistantSettingValidator)
    if (enabled && !provider.isConfigured()) {
      throw new errors.E_VALIDATION_ERROR([
        { field: 'enabled', rule: 'configured', message: "AI isn't set up for this store yet." },
      ])
    }
    const settings = await StoreSetting.current()
    settings.merge({ shoppingAssistantEnabled: enabled })
    await settings.save()
    session.flash(
      'success',
      enabled ? 'Shopping assistant turned on.' : 'Shopping assistant turned off.'
    )
    return response.redirect().toRoute('settings.store.edit')
  }
}

import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import AssistantModelProvider from '#assistant/model_provider'
import StoreSetting from '#models/settings/store_setting'
import StoreSettingPolicy from '#policies/settings/store_setting_policy'
import MoneyService from '#services/checkout/money_service'
import StoreSettingTransformer from '#transformers/settings/store_setting_transformer'
import { storeSettingsValidator } from '#validators/settings/store_setting'

export default class StoreSettingsController {
  @inject()
  async edit({ inertia, bouncer }: HttpContext, provider: AssistantModelProvider) {
    await bouncer.with(StoreSettingPolicy).authorize('update')
    const settings = await StoreSetting.current()
    return inertia.render('settings/store', {
      settings: StoreSettingTransformer.transform(settings, {
        assistantConfigured: provider.isConfigured(),
      }),
    })
  }

  @inject()
  async update({ request, response, session, bouncer }: HttpContext, money: MoneyService) {
    await bouncer.with(StoreSettingPolicy).authorize('update')
    const { storeName, contactEmail, shippingFee } =
      await request.validateUsing(storeSettingsValidator)
    const settings = await StoreSetting.current()
    settings.merge({ storeName, contactEmail, shippingMinor: money.toMinor(shippingFee) })
    await settings.save()
    session.flash('success', 'Store settings saved.')
    return response.redirect().toRoute('settings.store.edit')
  }
}
